const { db, admin } = require('../config/firebase');

exports.searchUsers = async (name) => {
    const snapshot = await db.collection('whitelist')
        .where('name', '>=', name)
        .where('name', '<=', name + '\uf8ff')
        .limit(20) // БРОНЯ: Не отдаем больше 20 юзеров за раз (защита от парсинга всей базы)
        .get();

    return snapshot.docs.map(doc => ({
        email: doc.id,
        name: doc.data().name
    }));
};

exports.getChats = async (email) => {
    const snapshot = await db.collection('chats')
        .where('participants', 'array-contains', email.toLowerCase().trim())
        .get();

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};

exports.createChat = async (participants) => {
    // БРОНЯ: Защита от дубликатов. Если хакер пришлет ["vasya", "vasya"], мы сделаем из этого уникальный список
    const uniqueParticipants = Array.from(new Set(participants.map(p => p.toLowerCase().trim())));

    const ref = await db.collection('chats').add({ participants: uniqueParticipants });
    return { id: ref.id, participants: uniqueParticipants };
};

exports.getMessages = async (chatId, cursor) => {
    let query = db.collection('chats')
        .doc(chatId)
        .collection('messages')
        .orderBy('createdAt', 'desc')
        .limit(30);

    if (cursor && cursor !== 'null') {
        const cursorDoc = await db.collection('chats').doc(chatId).collection('messages').doc(cursor).get();
        if (cursorDoc.exists) {
            query = query.startAfter(cursorDoc);
        }
    }

    const snapshot = await query.get();

    const messages = snapshot.docs.map(doc => {
        const data = doc.data();
        let dateString = new Date().toISOString();

        if (data.createdAt && data.createdAt.toDate) {
            dateString = data.createdAt.toDate().toISOString();
        } else if (typeof data.createdAt === 'string') {
            dateString = data.createdAt;
        }

        return { id: doc.id, ...data, createdAt: dateString };
    });

    return messages.reverse();
};

exports.sendMessage = async (chatId, text, sender, replyTo, files, io) => {
    // 2. Формируем объект для базы
    const dbMsg = {
        text: String(text || ""),
        sender: String(sender).toLowerCase().trim(),
        files: files || null, // <--- Сохраняем массив файлов (URL, имя, размер)
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (replyTo && replyTo.text) {
        dbMsg.replyTo = {
            id: String(replyTo.id || ''), 
            text: String(replyTo.text),
            sender: String(replyTo.sender).toLowerCase().trim()
        };
    }

    // 3. Пишем в Firestore
    const docRef = await db.collection('chats')
        .doc(chatId)
        .collection('messages')
        .add(dbMsg);

    // 4. Готовим объект для Socket.io
    const socketMsg = {
        id: docRef.id,
        text: dbMsg.text,
        sender: dbMsg.sender,
        files: dbMsg.files, // <--- Отправляем файлы в реальном времени
        replyTo: dbMsg.replyTo || null,
        createdAt: new Date().toISOString() 
    };

    // На фронтенде ChatArea.jsx слушает событие 'message'
    io.to(chatId).emit('message', socketMsg); 
    
    return true;
};