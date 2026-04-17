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
        const { text, sender } = req.body;
        const { chatId } = req.params;
        
        // Multer превращает объекты (как replyTo) в строки, парсим обратно
        let replyTo = null;
        if (req.body.replyTo) {
            replyTo = JSON.parse(req.body.replyTo);
        }

        // Собираем инфу о загруженных файлах из req.files
        const uploadedFiles = req.files ? req.files.map(file => ({
            name: file.originalname,
            size: file.size,
            type: file.mimetype,
            // Ссылка, по которой фронтенд сможет открыть картинку
            url: `${process.env.API_URL || 'http://localhost:5000'}/uploads/${file.filename}` 
        })) : null;

        if (!chatId || (!text && (!uploadedFiles || uploadedFiles.length === 0)) || !sender) {
            return res.status(400).json({ error: 'Пустое сообщение' });
        }

        await chatService.sendMessage(
            chatId,
            text ? text.trim() : "",
            sender,
            replyTo,
            uploadedFiles, // Передаем собранные файлы в сервис
            io
        );

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка отправки' });
    }
};