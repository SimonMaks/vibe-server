const { Server } = require('socket.io');
const { admin, db } = require('../config/firebase'); // Нам нужна база и админка для проверок

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

            // Расшифровываем токен
            const decodedToken = await admin.auth().verifyIdToken(token);
            
            // Записываем email прямо в объект сокета, чтобы знать, кто это
            socket.user = { email: decodedToken.uid };
            
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
                // 2. БРОНЯ СУПЕР-УРОВНЯ: Проверяем, есть ли этот юзер в чате
                const chatDoc = await db.collection('chats').doc(chatId).get();
                
                if (!chatDoc.exists) {
                    return socket.emit('error', { message: 'Чат не найден' });
                }

                const chatData = chatDoc.data();
                const cleanEmail = socket.user.email.toLowerCase().trim();

                // Если юзера нет в списке участников — выгоняем
                if (!chatData.participants || !chatData.participants.includes(cleanEmail)) {
                    console.log(`🚨 ПОПЫТКА ПРОСЛУШКИ! ${cleanEmail} ломится в чужой чат: ${chatId}`);
                    return socket.emit('error', { message: 'У вас нет доступа к этому чату' });
                }

                // Если всё ок - пускаем в комнату
                socket.join(chatId);
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