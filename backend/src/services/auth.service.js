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

    console.log(`--- Попытка входа для: ${cleanEmail} ---`);

    const userDoc = await db.collection('whitelist').doc(cleanEmail).get();
    if (!userDoc.exists) {
        console.log(`❌ Ошибка: Почты ${cleanEmail} нет в вайтлисте Firebase!`);
        return { success: false, error: 'Доступ запрещен' }; 
    }

    let isCodeValid = false;

    if (DEV_CODE && code === String(DEV_CODE)) {
        console.log(`🛠 Использован DEV_CODE`);
        isCodeValid = true;
    } else {
        const stored = getOtp(cleanEmail);
        console.log(`Код в памяти: ${stored}, Введенный код: ${code}`);
        
        if (stored && String(stored) === String(code)) {
            isCodeValid = true;
            deleteOtp(cleanEmail);
        }
    }

    if (isCodeValid) {
        try {
            console.log(`✅ Код верный. Пытаюсь создать токен...`);
            // Вот тут чаще всего затык:
            const customToken = await admin.auth().createCustomToken(cleanEmail);
            console.log(`🚀 Токен успешно создан!`);
            return { success: true, token: customToken };
        } catch (error) {
            // ЭТА ОШИБКА ПОЯВИТСЯ В ЛОГАХ RAILWAY
            console.error("❌ КРИТИЧЕСКАЯ ОШИБКА FIREBASE:", error.message);
            return { success: false, error: 'Ошибка сервера при создании токена' };
        }
    }

    console.log(`❌ Код не совпал`);
    return { success: false, error: 'Неверный код' };
};