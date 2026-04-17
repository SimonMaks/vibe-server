// middlewares/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Создаем папку uploads, если её нет
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Папка для сохранения
    },
    filename: function (req, file, cb) {
        // Делаем уникальное имя файла, чтобы они не перезаписали друг друга
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // Ограничение: 10 МБ на файл (БРОНЯ)
});

module.exports = upload;