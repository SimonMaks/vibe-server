// Добавляем admin, чтобы генерировать токены
const { admin, db } = require('../config/firebase'); 
const { setOtp, getOtp, deleteOtp } = require('../utils/otpStore');

exports.sendCode = async (email) => {
    const cleanEmail = email.toLowerCase().trim();

    const userDoc = await db.collection('whitelist').doc(cleanEmail).get();
    if (!userDoc.exists) {
        throw new Error('Доступ запрещен');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    setOtp(cleanEmail, code);

    // ВЫВОДИМ КОД В ЛОГИ RAILWAY (Пока нет реальной почты - это ок)
    console.log(`\n\n!!! КОД ДЛЯ ${cleanEmail}: ${code} !!!\n\n`);

    return true;
};

// Делаем функцию асинхронной (async), так как будем обращаться к базе и токенам
exports.verifyCode = async (req, res) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({ success: false, error: 'Данные не переданы' });
        }

        // Вызываем сервис и ЖДЕМ его (await)
        const result = await authService.verifyCode(email, code);

        // ВНИМАНИЕ: Если сервис вернул result.success = true, 
        // мы ОБЯЗАТЕЛЬНО отправляем это клиенту
        if (result.success) {
            return res.status(200).json({
                success: true,
                token: result.token
            });
        } else {
            return res.status(400).json({
                success: false,
                error: result.error || 'Неверный код'
            });
        }
    } catch (err) {
        console.error('Ошибка в контроллере аутентификации:', err);
        return res.status(500).json({ success: false, error: 'Сбой сервера' });
    }
};