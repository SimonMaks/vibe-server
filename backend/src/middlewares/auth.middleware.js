const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'Нет токена' });

        const token = authHeader.split(' ')[1]; // Убираем слово "Bearer"
        
        // Проверяем токен тем же ключом, которым создавали в auth.service
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'vibe-super-secret-key-123');
        
        req.user = decoded; // Записываем данные юзера в запрос
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Неверный токен' });
    }
};