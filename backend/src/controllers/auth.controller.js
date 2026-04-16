const authService = require('../services/auth.service');

exports.sendCode = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, error: 'Email обязателен' });
        
        await authService.sendCode(email);
        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка sendCode:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.verifyCode = async (req, res) => {
    try {
        const { email, code } = req.body;
        console.log(`[Controller] Проверка кода для ${email}: ${code}`);

        // Важно: здесь должен быть await!
        const result = await authService.verifyCode(email, code);

        if (result && result.success) {
            console.log(`[Controller] Успех! Отправляю токен.`);
            return res.json({ success: true, token: result.token });
        } else {
            console.log(`[Controller] Сервис вернул неудачу: ${result?.error}`);
            return res.status(400).json({ success: false, error: result?.error || 'Неверный код' });
        }
    } catch (err) {
        console.error('[Controller] Фатальная ошибка:', err);
        // Если мы уже отправили заголовки, не пытаемся отправить их снова
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
        }
    }
};