const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const nodemailer = require('nodemailer');
const admin = require('firebase-admin');
const dns = require('dns');
require('dotenv').config();

dns.setDefaultResultOrder('ipv4first');

// 1. ИНИЦИАЛИЗАЦИЯ
const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: "*", // Разрешаем подключаться кому угодно
    methods: ["GET", "POST"]
  }
});

app.use(cors({
    origin: '*'
}));
app.use(express.json());

// 2. FIREBASE ADMIN (Твой мастер-ключ)
// Проверяем: если есть переменная окружения, парсим её. Если нет — ищем файл (для локалки)
const serviceAccount = process.env.FIREBASE_CONFIG 
  ? JSON.parse(process.env.FIREBASE_CONFIG) 
  : require("./adminsdk.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Хранилище временных кодов (OTP)
const otps = {};

// 3. НАСТРОЙКА ПОЧТЫ
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

// 4. ЛОГИКА SOCKET.IO (Реальное время)
io.on('connection', (socket) => {
  console.log('🔌 Новый клиент:', socket.id);

  // Присоединение к комнате чата
  socket.on('join_chat', (chatId) => {
    socket.join(chatId);
    console.log(`👤 User joined room: ${chatId}`);
  });

  socket.on('disconnect', () => {
    console.log('❌ Клиент отключился');
  });
});

// 5. ЭНДПОИНТЫ АВТОРИЗАЦИИ

// Отправка кода
// app.post('/send-code', async (req, res) => {
//   const { email } = req.body;
//   const cleanEmail = email.toLowerCase().trim();

//   try {
//     // Проверяем, есть ли юзер в WhiteList
//     const userDoc = await db.collection('whitelist').doc(cleanEmail).get();
//     if (!userDoc.exists) {
//       return res.status(403).json({ success: false, error: 'Доступ запрещен' });
//     }

//     const code = Math.floor(100000 + Math.random() * 900000).toString();
//     otps[cleanEmail] = code;

//     await transporter.sendMail({
//       from: `"Vibe Messenger" <${process.env.EMAIL_USER}>`,
//       to: cleanEmail,
//       subject: 'Код входа',
//       text: `Твой код: ${code}`,
//     });

//     res.json({ success: true });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

app.post('/send-code', async (req, res) => {
  const { email } = req.body;
  const cleanEmail = email.toLowerCase().trim();

  try {
    const userDoc = await db.collection('whitelist').doc(cleanEmail).get();
    if (!userDoc.exists) {
      return res.status(403).json({ success: false, error: 'Доступ запрещен' });
    }

    // Генерируем код
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    otps[cleanEmail] = code;

    // ВЫВОДИМ КОД В ЛОГИ RAILWAY (Вместо почты)
    console.log(`\n\n!!! КОД ДЛЯ ${cleanEmail}: ${code} !!!\n\n`);

    // Отправляем успешный ответ фронтенду сразу, не пытаясь слать почту
    res.json({ success: true });

  } catch (err) {
    console.error("Ошибка на сервере:", err);
    res.status(500).json({ error: err.message });
  }
});

// Проверка кода
app.post('/verify-code', (req, res) => {
  const { email, code } = req.body;
  const cleanEmail = email.toLowerCase().trim();

  const DEV_CODE = process.env.DEV_LOGIN_CODE;

// ✅ dev-вход
  if (DEV_CODE && code === DEV_CODE) {
    console.log(`🛠 DEV LOGIN для ${cleanEmail}`);
    return res.json({ success: true, dev: true });
  }

// ✅ обычный OTP
  if (otps[cleanEmail] && otps[cleanEmail] === code) {
    delete otps[cleanEmail];
    return res.json({ success: true });
  } else {
    res.status(400).json({ success: false, error: 'Неверный код' });
  }
});

// 6. ЭНДПОИНТЫ МЕССЕНДЖЕРА

// Поиск пользователей в WhiteList по имени
app.get('/api/search', async (req, res) => {
  const { name } = req.query;
  try {
    const snapshot = await db.collection('whitelist')
      .where('name', '>=', name)
      .where('name', '<=', name + '\uf8ff')
      .get();
    
    const users = snapshot.docs.map(doc => ({ email: doc.id, name: doc.data().name }));
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Получение списка чатов пользователя
app.get('/api/chats', async (req, res) => {
  const { email } = req.query;
  try {
    const snapshot = await db.collection('chats')
      .where('participants', 'array-contains', email.toLowerCase())
      .get();
    const chats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// СОЗДАНИЕ НОВОГО ЧАТА
app.post('/api/chats', async (req, res) => {
  const { participants } = req.body;
  
  try {
    // Создаем новый документ в коллекции chats
    const newChatRef = await db.collection('chats').add({
      participants: participants
    });
    
    // Возвращаем фронтенду ID нового чата
    res.json({ id: newChatRef.id, participants });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Получение истории сообщений
app.get('/api/messages/:chatId', async (req, res) => {
  try {
    const snapshot = await db.collection('chats')
      .doc(req.params.chatId)
      .collection('messages')
      .orderBy('createdAt', 'asc')
      .get();
    const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ОТПРАВКА СООБЩЕНИЯ (Самое важное!)
app.post('/api/messages/:chatId', async (req, res) => {
  const { chatId } = req.params;
  const { text, sender } = req.body;

  try {
    const newMessage = {
      text,
      sender,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // 1. Пишем в базу (через админа)
    const docRef = await db.collection('chats').doc(chatId).collection('messages').add(newMessage);
    
    // 2. Готовим данные для сокета (заменяем серверный Timestamp на текущую дату для фронта)
    const socketMessage = { 
      id: docRef.id, 
      ...newMessage, 
      createdAt: { toDate: () => new Date() } // Эмуляция формата Firestore для фронта
    };

    // 3. РАССЫЛАЕМ ЧЕРЕЗ СОКЕТЫ всем в комнате chatId
    io.to(chatId).emit('receive_message', socketMessage);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. ЗАПУСК
const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});