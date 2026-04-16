const authService = require('../services/auth.service');

exports.sendCode = async (req, res) => {
    try {
        const { email } = req.body;

        // 1. БРОНЯ: Проверяем, что email передан и это строка
        if (!email || typeof email !== 'string') {
            return res.status(400).json({ success: false, error: 'Некорректный запрос' });
        }

        // 2. БРОНЯ: Проверяем, что это реально похоже на email, а не кусок SQL-кода
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            return res.status(400).json({ success: false, error: 'Неверный формат email' });
        }

        await authService.sendCode(email.trim());
        res.json({ success: true });

    } catch (err) {
        // 3. БРОНЯ: Логируем реальную ошибку для себя в консоли Railway...
        console.error('[Auth Error - sendCode]:', err.message);
        
        // ...а юзеру отдаем безопасную сухую фразу (статус 500 - ошибка сервера)
        res.status(500).json({ success: false, error: 'Не удалось отправить код, попробуйте позже' });
    }
};

exports.verifyCode = (req, res) => {
    try {
        const { email, code } = req.body;

        // 1. БРОНЯ: Проверяем наличие и почты, и кода
        if (!email || !code) {
            return res.status(400).json({ success: false, error: 'Не переданы email или код' });
        }

        // Принудительно приводим код к строке на случай, если пришлют число, и убираем пробелы
        const result = authService.verifyCode(email.trim(), String(code).trim());

        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json({ success: false, error: 'Неверный или просроченный код' });
        }
    } catch (err) {
        console.error('[Auth Error - verifyCode]:', err.message);
        res.status(500).json({ success: false, error: 'Ошибка проверки кода' });
    }
};