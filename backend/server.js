require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const socketHandler = require('./socket/socketHandler');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');
const chatRequestRoutes = require('./routes/chatRequests');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

connectDB();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/chat-requests', chatRequestRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', app: 'Chatzz' }));

socketHandler(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Chatzz server running on port ${PORT}`));
