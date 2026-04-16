const { db } = require('../config/firebase');
const { setOtp, getOtp, deleteOtp } = require('../utils/otpStore');

exports.sendCode = async (email) => {
    const cleanEmail = email.toLowerCase().trim();

    const userDoc = await db.collection('whitelist').doc(cleanEmail).get();
    if (!userDoc.exists) {
        throw new Error('Доступ запрещен');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    setOtp(cleanEmail, code);

    // ВЫВОДИМ КОД В ЛОГИ RAILWAY (Вместо почты)
    console.log(`\n\n!!! КОД ДЛЯ ${cleanEmail}: ${code} !!!\n\n`);

    return true;
};

exports.verifyCode = (email, code) => {
    const cleanEmail = email.toLowerCase().trim();

    const DEV_CODE = process.env.DEV_LOGIN_CODE;

    // ✅ dev-вход
    if (DEV_CODE && code === DEV_CODE) {
        console.log(`🛠 DEV LOGIN для ${cleanEmail}`);
        return { success: true, dev: true };
    }

    const stored = getOtp(cleanEmail);

    if (stored && stored === code) {
        deleteOtp(cleanEmail);
        return { success: true };
    }

    return { success: false };
};