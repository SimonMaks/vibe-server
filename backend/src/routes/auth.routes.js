const router = require('express').Router();
const controller = require('../controllers/auth.controller');

router.post('/send-code', controller.sendCode);
router.post('/verify-code', controller.verifyCode);

module.exports = router;