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
        const io = getIO();
        // 1. Извлекаем files из тела запроса
        const { text, sender, replyTo, files } = req.body; 
        const { chatId } = req.params;

        // 2. БРОНЯ: Обновленная валидация (разрешаем отправку, если есть либо текст, либо файлы)
        if (!chatId || (!text && !files) || !sender) {
            return res.status(400).json({ error: 'Не заполнены обязательные поля' });
        }

        if (text && text.length > 2000) {
            return res.status(400).json({ error: 'Сообщение слишком длинное' });
        }

        // 3. Передаем files пятым аргументом
        await chatService.sendMessage(
            chatId,
            text ? text.trim() : "",
            sender,
            replyTo,
            files, // <--- Важно!
            io
        );

        res.json({ success: true });
    } catch (err) {
        console.error("[Chat Error - sendMessage]:", err.message);
        res.status(500).json({ error: 'Не удалось отправить сообщение' });
    }
};