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

// 2. ПОЛУЧЕНИЕ ЧАТОВ ПОЛЬЗОВАТЕЛЯ
exports.getChats = async (email) => {
    const normalizedEmail = email.toLowerCase().trim();
    const chats = await Chat.findAll();
    
    // В SQLite фильтровать JSON-массивы лучше на уровне JavaScript (надежнее)
    return chats.filter(c => {
        // Страховка: если SQLite вернул строку, парсим её в массив
        const participants = typeof c.participants === 'string' 
            ? JSON.parse(c.participants) 
            : c.participants;
            
        return participants && participants.includes(normalizedEmail);
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

    // 2. Превращаем результат из формата базы в обычный объект
    const socketMsg = newMessage.toJSON();

    // Парсим JSON, если SQLite вернул их как строки
    if (typeof socketMsg.files === 'string') socketMsg.files = JSON.parse(socketMsg.files);
    if (typeof socketMsg.replyTo === 'string') socketMsg.replyTo = JSON.parse(socketMsg.replyTo);

    // 3. Отправляем через сокеты в комнату (чат)
    io.to(chatId).emit('message', socketMsg);
    
    return socketMsg;
};