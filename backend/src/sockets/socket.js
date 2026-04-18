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
                // 2. БРОНЯ СУПЕР-УРОВНЯ: Ищем чат в нашей локальной SQLite базе
                const chat = await Chat.findByPk(chatId); // findByPk ищет по ID (Primary Key)
                
                if (!chat) {
                    return socket.emit('error', { message: 'Чат не найден' });
                }

                // SQLite может вернуть JSON как строку, парсим если нужно
                let participants = chat.participants;
                if (typeof participants === 'string') {
                    participants = JSON.parse(participants);
                }

                const cleanEmail = socket.user.email.toLowerCase().trim();

                // Если юзера нет в списке участников — выгоняем
                if (!participants || !participants.includes(cleanEmail)) {
                    console.log(`🚨 ПОПЫТКА ПРОСЛУШКИ! ${cleanEmail} ломится в чужой чат: ${chatId}`);
                    return socket.emit('error', { message: 'У вас нет доступа к этому чату' });
                }

                // Если всё ок - пускаем в комнату
                socket.join(chatId.toString()); // Переводим ID в строку для надежности
                console.log(`👤 ${cleanEmail} успешно зашел в комнату: ${chatId}`);
            } catch (error) {
                console.error('Ошибка при проверке доступа к комнате:', error.message);
            }
        });

        socket.on('disconnect', () => {
            console.log(`❌ Клиент отключился: ${socket.user.email}`);
        });
    });
};

exports.getIO = () => io;