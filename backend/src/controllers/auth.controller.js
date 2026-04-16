const authService = require('../services/auth.service');

exports.sendCode = async (req, res) => {
    try {
        await authService.sendCode(req.body.email);
        res.json({ success: true });
    } catch (err) {
        res.status(403).json({ success: false, error: err.message });
    }
};

exports.verifyCode = (req, res) => {
    const result = authService.verifyCode(req.body.email, req.body.code);

    if (result.success) {
        res.json(result);
    } else {
        res.status(400).json({ success: false, error: 'Неверный код' });
    }
};