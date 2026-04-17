const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite' // Твоя база будет лежать в этом файле
});

module.exports = sequelize;