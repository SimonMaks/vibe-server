const http = require('http');
const app = require('./app'); // Твой express-файл
const { initSocket } = require('./sockets/socket');
const sequelize = require('./config/db'); // Исправлен путь (убрали ../)
require('./models'); // Просто импортируем модели, чтобы Sequelize узнал о них до синхронизации

// 1. БРОНЯ: Ловим фатальные ошибки
process.on('uncaughtException', (err) => {
    console.error('🔥 КРИТИЧЕСКАЯ ОШИБКА (Uncaught Exception):', err);
    process.exit(1); 
});

process.on('unhandledRejection', (err) => {
    console.error('🔥 НЕОТЛОВЛЕННЫЙ ПРОМИС (Unhandled Rejection):', err);
    process.exit(1);
});

const server = http.createServer(app);
initSocket(server);

const PORT = process.env.PORT || 3000;

// ⚡ ПОДКЛЮЧАЕМ БАЗУ И ТОЛЬКО ПОТОМ ЗАПУСКАЕМ СЕРВЕР ⚡
sequelize.sync()
    .then(async () => {
        console.log('📦 База данных SQLite успешно инициализирована!');
        
        // --- ВРЕМЕННЫЙ КОД ДЛЯ ТЕСТА (потом удалишь) ---
        const { Whitelist } = require('./models');
        await Whitelist.findOrCreate({ 
            where: { email: 'test1@gmail.com' }, 
            defaults: { name: 'Иван Тестовый' } 
        });
        await Whitelist.findOrCreate({ 
            where: { email: 'test2@gmail.com' }, 
            defaults: { name: 'Анна Проверка' } 
        });
        // ----------------------------------------------

        server.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Сервер Vibe Messenger успешно запущен на порту ${PORT}`);
        });
    })

// 2. БРОНЯ: Мягкое отключение
process.on('SIGTERM', () => {
    console.log('🛑 Получен сигнал SIGTERM от Railway (перезагрузка/выключение).');
    console.log('Мягко завершаем работу, закрываем соединения...');
    
    server.close(() => {
        console.log('✅ HTTP-сервер закрыт.');
        // Закрываем подключение к БД перед выходом
        sequelize.close().then(() => {
            console.log('✅ Подключение к базе данных закрыто. Процесс безопасно завершен.');
            process.exit(0);
        });
    });
});