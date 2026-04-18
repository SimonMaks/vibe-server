const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'vibe-super-secret-key-123'; // Тот же, что в сервисе!

module.exports = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'Нет токена' });

        const token = authHeader.split(' ')[1]; 
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; 
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Неверный токен' });
    }
};