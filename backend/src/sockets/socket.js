const { Server } = require('socket.io');
const jwt = require('jsonwebtoken'); // ⚡ Подключили JWT
const { Chat } = require('../models');

let io;

exports.initSocket = (server) => {
    io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Authentication error: Нет токена'));

        try {
            // ⚡ Проверяем токен нашим ключом
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'vibe-super-secret-key-123');
            socket.user = { email: decoded.email };
            next();
        } catch (err) {
            next(new Error('Authentication error: Неверный токен'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`🔌 Новый клиент подключен: ${socket.user.email} (ID: ${socket.id})`);

        socket.on('join_chat', async (chatId) => {
            try {
                const id = parseInt(chatId); // ⚡ Всегда приводим к числу для findByPk
                const chat = await Chat.findByPk(id);
        
                if (!chat) {
                    console.log(`❌ Чат ${id} не найден`);
                    return;
                }

                let p = chat.participants;
                if (typeof p === 'string') p = JSON.parse(p);

                const cleanEmail = socket.user.email.toLowerCase().trim();

                if (p.includes(cleanEmail)) {
                    const roomName = String(id);
                    // Выходим из других комнат
                    socket.rooms.forEach(room => { if(room !== socket.id) socket.leave(room); });
            
                    socket.join(roomName);
                    console.log(`✅ ${cleanEmail} вошел в комнату: ${roomName}`);
                } else {
                    console.log(`🚫 Доступ запрещен для ${cleanEmail} в чат ${id}`);
                }
            } catch (error) {
                console.error('Ошибка сокета:', error.message);
            }
        });

        socket.on('disconnect', () => {
            console.log(`❌ Клиент отключился: ${socket.user.email}`);
        });
    });
};

exports.getIO = () => io;