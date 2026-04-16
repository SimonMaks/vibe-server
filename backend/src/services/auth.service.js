const { admin, db } = require('../config/firebase');
const { setOtp, getOtp, deleteOtp } = require('../utils/otpStore');

exports.sendCode = async (email) => {
    const cleanEmail = email.toLowerCase().trim();
    const userDoc = await db.collection('whitelist').doc(cleanEmail).get();
    
    if (!userDoc.exists) {
        throw new Error('Вас нет в списке доступа');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setOtp(cleanEmail, code);
    console.log(`\n!!! КОД ДЛЯ ${cleanEmail}: ${code} !!!\n`);
    return true;
};

exports.verifyCode = async (email, code) => {
    const cleanEmail = email.toLowerCase().trim();
    const stored = getOtp(cleanEmail);

    console.log(`[Service] Сверяю: в памяти ${stored}, введено ${code}`);

    if (stored && String(stored) === String(code)) {
        try {
            deleteOtp(cleanEmail);
            console.log(`[Service] Код совпал. Генерирую токен...`);
            const customToken = await admin.auth().createCustomToken(cleanEmail);
            return { success: true, token: customToken };
        } catch (error) {
            console.error("[Service] Ошибка Firebase:", error.message);
            return { success: false, error: "Ошибка Firebase токена" };
        }
    }

    return { success: false, error: "Неверный или просроченный код" };
};