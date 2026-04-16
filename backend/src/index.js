const http = require('http');
const app = require('./app'); // Твой express-файл (server.js / app.js)
const { initSocket } = require('./sockets/socket');

// 1. БРОНЯ: Ловим фатальные ошибки, чтобы сервер не умирал молча
process.on('uncaughtException', (err) => {
    console.error('🔥 КРИТИЧЕСКАЯ ОШИБКА (Uncaught Exception):', err);
    // Желательно завершить процесс, Railway сам его перезапустит
    process.exit(1); 
});

process.on('unhandledRejection', (err) => {
    console.error('🔥 НЕОТЛОВЛЕННЫЙ ПРОМИС (Unhandled Rejection):', err);
    process.exit(1);
});

const server = http.createServer(app);

initSocket(server);

const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Сервер Vibe Messenger успешно запущен на порту ${PORT}`);
});

// 2. БРОНЯ: Мягкое отключение (Graceful Shutdown) для Railway
process.on('SIGTERM', () => {
    console.log('🛑 Получен сигнал SIGTERM от Railway (перезагрузка/выключение).');
    console.log('Мягко завершаем работу, закрываем соединения...');
    
    // Закрываем сервер, чтобы он перестал принимать НОВЫЕ запросы,
    // но дал время завершиться ТЕКУЩИМ.
    server.close(() => {
        console.log('✅ HTTP-сервер закрыт. Процесс безопасно завершен.');
        process.exit(0);
    });
});