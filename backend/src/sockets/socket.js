const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { Chat } = require('../models');
const { Op } = require('sequelize');

let io;

exports.initSocket = (server) => {
    io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Authentication error'));

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'vibe-super-secret-key-123');
            socket.user = { email: decoded.email.toLowerCase().trim() };
            next();
        } catch (err) {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', async (socket) => {
        const userEmail = socket.user.email;
        console.log(`🔌 Подключен: ${userEmail}`);

        // ⚡ ИСПРАВЛЕНИЕ 2: При подключении сразу добавляем пользователя во все его комнаты.
        // Это нужно, чтобы он получал уведомления/сообщения из всех своих чатов сразу.
        try {
            const userChats = await Chat.findAll({
                where: {
                    participants: { [Op.like]: `%${userEmail}%` }
                }
            });
            userChats.forEach(chat => {
                socket.join(String(chat.id));
            });
            console.log(`✅ ${userEmail} вошел в ${userChats.length} комнат`);
        } catch (err) {
            console.error('Ошибка при авто-входе в комнаты:', err.message);
        }

        socket.on('join_chat', async (chatId) => {
            try {
                const id = parseInt(chatId);
                const chat = await Chat.findByPk(id);
                if (!chat) return;

                let p = typeof chat.participants === 'string' ? JSON.parse(chat.participants) : chat.participants;

                if (p.includes(userEmail)) {
                    // ⚡ ИСПРАВЛЕНИЕ 3: УБРАЛИ socket.leave(room). 
                    // Пользователь должен находиться во всех своих комнатах одновременно.
                    socket.join(String(id));
                }
            } catch (error) {
                console.error('Ошибка join_chat:', error.message);
            }
        });

        socket.on('disconnect', () => {
            console.log(`❌ Отключился: ${userEmail}`);
        });
    });
};

exports.getIO = () => io;