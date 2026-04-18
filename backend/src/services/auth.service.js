const { admin } = require('../config/firebase'); // db больше не нужен!
const { Whitelist } = require('../models'); // Подключаем нашу SQLite модель
const { setOtp, getOtp, deleteOtp } = require('../utils/otpStore');

exports.sendCode = async (email) => {
    const cleanEmail = email.toLowerCase().trim();
    
    // ⚡ Ищем почту в нашей новой локальной SQLite базе
    const user = await Whitelist.findOne({ where: { email: cleanEmail } });
    
    if (!user) {
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
            
            // ⚡ Токен по-прежнему генерируем через надежный Firebase Auth
            const customToken = await admin.auth().createCustomToken(cleanEmail);
            return { success: true, token: customToken };
        } catch (error) {
            console.error("[Service] Ошибка Firebase:", error.message);
            return { success: false, error: "Ошибка Firebase токена" };
        }
    }

    return { success: false, error: "Неверный или просроченный код" };
};