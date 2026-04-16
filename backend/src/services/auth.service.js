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
exports.verifyCode = async (email, code) => {
    const cleanEmail = email.toLowerCase().trim();
    const DEV_CODE = process.env.DEV_LOGIN_CODE;

    // 1. БРОНЯ: Обязательно проверяем вайтлист ДАЖЕ при вводе кода!
    const userDoc = await db.collection('whitelist').doc(cleanEmail).get();
    if (!userDoc.exists) {
        return { success: false }; 
    }

    let isCodeValid = false;

    // 2. Проверяем код
    if (DEV_CODE && code === String(DEV_CODE)) {
        console.log(`🛠 DEV LOGIN для ${cleanEmail}`);
        isCodeValid = true;
    } else {
        const stored = getOtp(cleanEmail);
        if (stored && stored === String(code)) {
            isCodeValid = true;
            deleteOtp(cleanEmail); // Удаляем использованный код
        }
    }

    // 3. БРОНЯ СУПЕР-УРОВНЯ: Выдаем Firebase Token
    if (isCodeValid) {
        try {
            // Создаем токен, где UID = email пользователя
            const customToken = await admin.auth().createCustomToken(cleanEmail);
            
            // Возвращаем токен клиенту!
            return { success: true, token: customToken };
        } catch (error) {
            console.error("Ошибка создания Firebase токена:", error);
            return { success: false };
        }
    }

    return { success: false };
};