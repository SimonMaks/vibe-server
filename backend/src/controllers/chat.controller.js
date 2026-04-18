const chatService = require('../services/chat.service');
const { getIO } = require('../sockets/socket');

exports.search = async (req, res) => {
    try {
        const { name } = req.query;

        // 1. БРОНЯ: Проверка, что имя передано, это строка и не слишком длинное
        if (!name || typeof name !== 'string' || name.length > 50) {
            return res.status(400).json({ error: 'Некорректный запрос поиска' });
        }

        const users = await chatService.searchUsers(name.trim());
        res.json(users);
    } catch (err) {
        // 2. БРОНЯ: Прячем ошибки базы данных от юзеров
        console.error('[Chat Error - search]:', err.message);
        res.status(500).json({ error: 'Ошибка при поиске пользователей' });
    }
};

exports.getChats = async (req, res) => {
    try {
        const { email } = req.query;

        if (!email || typeof email !== 'string') {
            return res.status(400).json({ error: 'Некорректный email' });
        }

        const chats = await chatService.getChats(email.trim());
        res.json(chats);
    } catch (err) {
        console.error('[Chat Error - getChats]:', err.message);
        res.status(500).json({ error: 'Ошибка при загрузке чатов' });
    }
};

exports.createChat = async (req, res) => {
    try {
        const { participants } = req.body;

        // БРОНЯ: Проверяем, что передали именно массив и в нем есть хотя бы 2 человека
        if (!Array.isArray(participants) || participants.length < 2) {
            return res.status(400).json({ error: 'Некорректный список участников (нужно минимум 2)' });
        }

        const chat = await chatService.createChat(participants);
        res.json(chat);
    } catch (err) {
        console.error('[Chat Error - createChat]:', err.message);
        res.status(500).json({ error: 'Ошибка при создании чата' });
    }
};

exports.getMessages = async (req, res) => {
    try {
        const { cursor } = req.query; 
        const { chatId } = req.params;

        if (!chatId || typeof chatId !== 'string') {
            return res.status(400).json({ error: 'Некорректный ID чата' });
        }

        const messages = await chatService.getMessages(chatId, cursor);
        res.json(messages);
    } catch (err) {
        console.error('[Chat Error - getMessages]:', err.message);
        res.status(500).json({ error: 'Ошибка при загрузке истории сообщений' });
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { text, sender, replyTo } = req.body;

        console.log(`[API] Попытка отправки сообщения в чат ${chatId} от ${sender}`);

        // Собираем файлы, если они есть
        const files = req.files ? req.files.map(f => ({
            name: f.originalname,
            url: `${req.protocol}://${req.get('host')}/uploads/${f.filename}`,
            size: f.size,
            type: f.mimetype
        })) : [];

        const io = getIO();
        
        // Парсим replyTo, если это пришло как строка
        let parsedReply = null;
        if (replyTo && replyTo !== 'null' && replyTo !== 'undefined') {
            parsedReply = typeof replyTo === 'string' ? JSON.parse(replyTo) : replyTo;
        }

        const message = await chatService.sendMessage(
            chatId, 
            text, 
            sender, 
            parsedReply, 
            files, 
            io
        );

        res.status(200).json(message);
    } catch (error) {
        console.error("🔥 ОШИБКА КОНТРОЛЛЕРА:", error.message);
        res.status(500).json({ error: error.message });
    }
};