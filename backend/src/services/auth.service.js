const { Whitelist } = require('../models');
const { setOtp, getOtp, deleteOtp } = require('../utils/otpStore');
const jwt = require('jsonwebtoken'); // ⚡ НАШ НОВЫЙ ГЕНЕРАТОР ПРОПУСКОВ

exports.sendCode = async (email) => {
    const cleanEmail = email.toLowerCase().trim();
    const user = await Whitelist.findOne({ where: { email: cleanEmail } });
    if (!user) throw new Error('Вас нет в списке доступа');

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setOtp(cleanEmail, code);
    console.log(`\n!!! КОД ДЛЯ ${cleanEmail}: ${code} !!!\n`);
    return true;
};

exports.verifyCode = async (email, code) => {
    const cleanEmail = email.toLowerCase().trim();
    const stored = getOtp(cleanEmail);

    if (stored && String(stored) === String(code)) {
        deleteOtp(cleanEmail);
        
        // ⚡ Генерируем свой токен (живет 30 дней)
        const token = jwt.sign(
            { email: cleanEmail }, 
            process.env.JWT_SECRET || 'vibe-super-secret-key-123', 
            { expiresIn: '30d' }
        );
        return { success: true, token };
    }
    return { success: false, error: "Неверный код" };
};