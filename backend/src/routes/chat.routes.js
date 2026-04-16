const router = require('express').Router();
const controller = require('../controllers/chat.controller');

router.get('/search', controller.search);
router.get('/chats', controller.getChats);
router.post('/chats', controller.createChat);
router.get('/messages/:chatId', controller.getMessages);
router.post('/messages/:chatId', controller.sendMessage);

module.exports = router;