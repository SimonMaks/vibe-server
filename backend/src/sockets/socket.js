const { Server } = require('socket.io');
const { admin } = require('../config/firebase'); // db убрали, admin оставили для токенов
const { Chat } = require('../models'); // Подключаем модель чатов из SQLite

let io;

exports.initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    // 1. БРОНЯ: Фейсконтроль при подключении к сокету (Middleware)
    io.use(async (socket, next) => {
        try {
            // Фронтенд должен присылать токен при подключении
            const token = socket.handshake.auth.token;
            
            if (!token) {
                return next(new Error('Authentication error: Нет токена'));
            }

            // Расшифровываем токен (Firebase Auth всё еще работает на страже)
            const decodedToken = await admin.auth().verifyIdToken(token);
            
            // Записываем email прямо в объект сокета, чтобы знать, кто это
            socket.user = { email: decodedToken.email || decodedToken.uid }; // На всякий случай берем email напрямую
            
            next(); // Пропускаем!
        } catch (err) {
            console.error('Ошибка авторизации сокета:', err.message);
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