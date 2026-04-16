// Используем Map вместо обычного объекта (он быстрее работает с частым добавлением/удалением)
const store = new Map();

// Время жизни кода (5 минут = 300 000 миллисекунд)
const TTL = 5 * 60 * 1000;

exports.setOtp = (email, code) => {
    const cleanEmail = email.toLowerCase().trim();
    store.set(cleanEmail, code);

    // БРОНЯ: Код автоматически удалится через 5 минут
    setTimeout(() => {
        if (store.has(cleanEmail) && store.get(cleanEmail) === code) {
            store.delete(cleanEmail);
            console.log(`🗑 Код для ${cleanEmail} просрочен и удален`);
        }
    }, TTL);
};

exports.getOtp = (email) => {
    return store.get(email.toLowerCase().trim());
};

exports.deleteOtp = (email) => {
    store.delete(email.toLowerCase().trim());
};