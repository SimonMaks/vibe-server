const router = require('express').Router();
const controller = require('../controllers/auth.controller');
const rateLimit = require('express-rate-limit');

// 1. БРОНЯ: Защита от спама письмами (Email Bombing)
// Разрешаем запрашивать код только 3 раза в 15 минут с одного IP
const sendCodeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 3, 
    message: { success: false, error: "Слишком много запросов кода. Подождите 15 минут." }
});

// 2. БРОНЯ: Защита от подбора кода (Brute-force)
// Разрешаем ошибаться при вводе кода только 5 раз
const verifyCodeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 5, 
    message: { success: false, error: "Слишком много попыток ввода. Подождите 15 минут." }
});

// Вешаем лимитеры как middleware перед контроллерами
router.post('/send-code', sendCodeLimiter, controller.sendCode);
router.post('/verify-code', verifyCodeLimiter, controller.verifyCode);

module.exports = router;