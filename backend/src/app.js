const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const chatRoutes = require('./routes/chat.routes');

const app = express();

// Это нужно для правильной работы Rate Limit за прокси-серверами (Railway, Nginx)
app.set('trust proxy', 1);

// Базовая безопасность заголовков
app.use(helmet());

app.use(cors({ origin: '*' }));
app.use(express.json()); // Парсим входящий JSON (оставили только один раз)

// Раздаем статические файлы (наши картинки)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Базовый глобальный лимит (если юзер не попал под специфичные лимиты роутов)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // лимит 100 запросов
  message: "Слишком много запросов от вас, отдохните немного!"
});
app.use(limiter);

// Подключаем роуты
app.use('/', authRoutes);
app.use('/api', chatRoutes);

module.exports = app;