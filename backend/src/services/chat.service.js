const { db, admin } = require('../config/firebase');

exports.searchUsers = async (name) => {
    const snapshot = await db.collection('whitelist')
        .where('name', '>=', name)
        .where('name', '<=', name + '\uf8ff')
        .get();

    return snapshot.docs.map(doc => ({
        email: doc.id,
        name: doc.data().name
    }));
};

exports.getChats = async (email) => {
    const snapshot = await db.collection('chats')
        .where('participants', 'array-contains', email.toLowerCase())
        .get();

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};

exports.createChat = async (participants) => {
    const ref = await db.collection('chats').add({ participants });
    return { id: ref.id, participants };
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

exports.sendMessage = async (chatId, text, sender, replyTo, io) => {
    // 1. Создаем объект для Firebase
    const dbMsg = {
        text: String(text),
        sender: String(sender),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Если replyTo пришел - берем из него только текст и отправителя
    if (replyTo && replyTo.text) {
        dbMsg.replyTo = {
            id: String(replyTo.id || ''), // <--- ДОБАВЛЯЕМ ВОТ ЭТУ СТРОЧКУ
            text: String(replyTo.text),
            sender: String(replyTo.sender)
        };
    }

    // 2. Пишем в базу
    const docRef = await db.collection('chats')
        .doc(chatId)
        .collection('messages')
        .add(dbMsg);

    // 3. Сразу готовим ответ для сокета
    const socketMsg = {
        id: docRef.id,
        text: dbMsg.text,
        sender: dbMsg.sender,
        replyTo: dbMsg.replyTo || null,
        createdAt: new Date().toISOString() // Для мгновенного отображения времени
    };

    io.to(chatId).emit('receive_message', socketMsg);
    return true;
};