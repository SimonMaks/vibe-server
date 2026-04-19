const { Chat, Message, Whitelist } = require('../models');
const { Op } = require('sequelize');

// 1. ПОИСК ПОЛЬЗОВАТЕЛЕЙ
exports.searchUsers = async (name) => {
    // Ищем в нашей локальной таблице Whitelist (по первым буквам)
    const users = await Whitelist.findAll({
        where: {
            name: {
                [Op.like]: `${name}%` // Ищет совпадения, начинающиеся с name
            }
        },
        limit: 20 // БРОНЯ: Не отдаем больше 20 юзеров за раз
    });

    return users.map(u => ({
        email: u.email,
        name: u.name
    }));
};

// 2. ПОЛУЧЕНИЕ ЧАТОВ ПОЛЬЗОВАТЕЛЯ (Оптимизировано!)
exports.getChats = async (email) => {
    if (!email) return []; // Броня от пустых запросов
    const normalizedEmail = email.toLowerCase().trim();
    
    const chats = await Chat.findAll({
        where: {
            participants: {
                // Ищем email просто как подстроку. Для SQLite JSON это надежнее.
                [Op.like]: `%${normalizedEmail}%` 
            }
        },
        order: [['updatedAt', 'DESC']] // Чтобы последние чаты были сверху
    });
    
    return chats.map(c => {
        const plainChat = c.toJSON();
        // Принудительно парсим участников, если база вернула строку
        if (typeof plainChat.participants === 'string') {
            try { plainChat.participants = JSON.parse(plainChat.participants); } catch(e) { plainChat.participants = []; }
        }
        return plainChat;
    });
};

// 3. СОЗДАНИЕ ЧАТА
exports.createChat = async (participants) => {
    const uniqueParticipants = Array.from(new Set(participants.map(p => p.toLowerCase().trim())));

    // Создаем запись в базе
    const newChat = await Chat.create({ 
        participants: uniqueParticipants 
    });
    
    return { id: newChat.id, participants: uniqueParticipants };
};

// 4. ЗАГРУЗКА ИСТОРИИ СООБЩЕНИЙ (с курсором/пагинацией)
exports.getMessages = async (chatId, cursor) => {
    let queryOptions = {
        where: { chatId },
        order: [['createdAt', 'DESC']], // Сначала новые
        limit: 30
    };

    // Если передан курсор (ID последнего загруженного сообщения), грузим те, что были ДО него
    if (cursor && cursor !== 'null') {
        queryOptions.where.id = {
            [Op.lt]: cursor 
        };
    }

    const messages = await Message.findAll(queryOptions);

    // Форматируем данные для фронтенда
    const formattedMessages = messages.map(msg => {
        const plainMsg = msg.toJSON();
        
        // SQLite может хранить JSON как текст, превращаем обратно в объекты
        if (typeof plainMsg.files === 'string') plainMsg.files = JSON.parse(plainMsg.files);
        if (typeof plainMsg.replyTo === 'string') plainMsg.replyTo = JSON.parse(plainMsg.replyTo);
        
        return plainMsg;
    });

    // Разворачиваем, чтобы старые были сверху, новые снизу (как в мессенджерах)
    return formattedMessages.reverse();
};

// 5. ОТПРАВКА СООБЩЕНИЯ
exports.sendMessage = async (chatId, text, sender, replyTo, files, io) => {
    // 1. Пишем в локальную базу данных
    const newMessage = await Message.create({
        chatId,
        text: String(text || ""),
        sender: String(sender).toLowerCase().trim(),
        files: files || null,
        replyTo: replyTo || null
    });

    // ⚡ ИСПРАВЛЕНИЕ 1: Обновляем updatedAt в таблице Chat, 
    // чтобы этот чат поднялся наверх в списке (getChats использует updatedAt)
    await Chat.update(
        { updatedAt: new Date() }, 
        { where: { id: chatId } }
    );

    const socketMsg = newMessage.toJSON();

    if (typeof socketMsg.files === 'string') socketMsg.files = JSON.parse(socketMsg.files);
    if (typeof socketMsg.replyTo === 'string') socketMsg.replyTo = JSON.parse(socketMsg.replyTo);

    // 3. Отправляем через сокеты
    io.to(String(chatId)).emit('message', socketMsg);
    
    return socketMsg;
};