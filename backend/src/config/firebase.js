const admin = require('firebase-admin');

let serviceAccount;

try {
  if (process.env.FIREBASE_CONFIG) {
    // 1. Пытаемся прочитать конфиг из Railway (переменная окружения)
    serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
  } else {
    // 2. Если переменной нет, берем локальный файл
    serviceAccount = require("../../adminsdk.json");
  }
} catch (error) {
  // 3. Броня: Если JSON кривой или файла нет — выдаем четкую ошибку
  console.error("КРИТИЧЕСКАЯ ОШИБКА: Не удалось загрузить настройки Firebase Admin!");
  console.error("Проверь переменную FIREBASE_CONFIG на Railway или наличие adminsdk.json локально.");
  console.error("Детали:", error.message);
  
  // Убиваем процесс, потому что без базы серверу нет смысла работать
  process.exit(1); 
}

// Инициализация
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

module.exports = { admin, db };