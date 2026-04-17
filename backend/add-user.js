// add-user.js (сокращенная версия)
const sequelize = require('./src/config/db');
const { Whitelist } = require('./src/models');

async function addUser(email, name) {
    try {
        await sequelize.authenticate();
        
        // Эта строка создаст таблицу Whitelists в файле database.sqlite
        await sequelize.sync(); 
        
        await Whitelist.findOrCreate({
            where: { email: email.toLowerCase().trim() },
            defaults: { name: name }
        });
        console.log("✅ Готово!");
    } catch (e) { console.error(e); }
    finally { process.exit(); }
}
addUser(process.argv[2], process.argv[3]);