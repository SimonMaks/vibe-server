const router = require('express').Router();
const controller = require('../controllers/chat.controller');
const rateLimit = require('express-rate-limit');
const upload = require('../middlewares/upload');
const auth = require('../middlewares/auth.middleware');

router.get('/search', auth, controller.search);
router.get('/chats', auth, controller.getChats);
router.post('/chats', auth, controller.createChat);
router.get('/messages/:chatId', auth, controller.getMessages);
router.post('/messages/:chatId', auth, upload.array('files', 10), controller.sendMessage);

// 1. БРОНЯ: Лимит на поиск (чтобы хакеры не выкачали всю твою базу юзеров)
const searchLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 минута
    max: 30, // максимум 30 поисков в минуту
    message: { error: "Слишком частые запросы поиска. Подождите минуту." }
});

// 2. БРОНЯ: Лимит на создание чатов (защита от ботов, создающих тысячи пустых комнат)
const createChatLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 10, // максимум 10 новых чатов за 15 минут
    message: { error: "Вы создаете слишком много чатов. Сбавьте темп." }
});

// 3. БРОНЯ: Лимит на сообщения (Анти-флуд)
const messageLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 минута
    max: 60, // максимум 60 сообщений в минуту (1 в секунду)
    message: { error: "Вы отправляете сообщения слишком быстро!" }
});

module.exports = router;