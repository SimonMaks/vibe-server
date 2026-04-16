const http = require('http');
const app = require('./app');
const { initSocket } = require('./sockets/socket');

const server = http.createServer(app);

initSocket(server);

const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});