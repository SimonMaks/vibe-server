const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const chatRoutes = require('./routes/chat.routes');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/', authRoutes);
app.use('/api', chatRoutes);

module.exports = app;