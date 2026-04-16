const chatService = require('../services/chat.service');
const { getIO } = require('../sockets/socket');

exports.search = async (req, res) => {
    try {
        const users = await chatService.searchUsers(req.query.name);
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getChats = async (req, res) => {
    try {
        const chats = await chatService.getChats(req.query.email);
        res.json(chats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createChat = async (req, res) => {
    try {
        const chat = await chatService.createChat(req.body.participants);
        res.json(chat);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getMessages = async (req, res) => {
    try {
        const { cursor } = req.query; 
        const messages = await chatService.getMessages(req.params.chatId, cursor);
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const io = getIO();
        const { text, sender, replyTo } = req.body; // Явно вытаскиваем из тела
        const { chatId } = req.params;

        // ПЕРЕДАЕМ СТРОГО В ЭТОМ ПОРЯДКЕ
        await chatService.sendMessage(
            chatId,
            text,
            sender,
            replyTo,
            io
        );

        res.json({ success: true });
    } catch (err) {
        console.error("Ошибка в контроллере:", err);
        res.status(500).json({ error: err.message });
    }
};