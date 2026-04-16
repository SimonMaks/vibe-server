const { Server } = require('socket.io');

let io;

exports.initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        console.log('🔌 Новый клиент:', socket.id);

        socket.on('join_chat', (chatId) => {
            socket.join(chatId);
            console.log(`👤 User joined room: ${chatId}`);
        });

        socket.on('disconnect', () => {
            console.log('❌ Клиент отключился');
        });
    });
};

exports.getIO = () => io;