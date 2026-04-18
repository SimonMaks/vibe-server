const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// 1. Таблица Чатов
const Chat = sequelize.define('Chat', {
  participants: { type: DataTypes.JSON } 
});

// 2. Таблица Сообщений
const Message = sequelize.define('Message', {
  text: { type: DataTypes.TEXT },
  sender: { type: DataTypes.STRING },
  chatId: { type: DataTypes.INTEGER },
  files: { type: DataTypes.JSON },
  replyTo: { type: DataTypes.JSON },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

// 3. Таблица Пользователей
const Whitelist = sequelize.define('Whitelist', {
    email: { type: DataTypes.STRING, unique: true },
    name: { type: DataTypes.STRING }
});

// ⚡ СВЯЗИ ТАБЛИЦ (Associations) ⚡
// Говорим базе, что у одного Чата может быть много Сообщений
Chat.hasMany(Message, { foreignKey: 'chatId', as: 'messages' });
// И что каждое Сообщение принадлежит конкретному Чату
Message.belongsTo(Chat, { foreignKey: 'chatId' });

// Экспортируем модели
module.exports = { Chat, Message, Whitelist };