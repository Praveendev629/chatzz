const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
require('dotenv').config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const chatRoutes = require('./routes/chat');
const messageRoutes = require('./routes/message');
const statusRoutes = require('./routes/status');
const socketHandler = require('./socket/socketHandler');

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files locally (fallback when Cloudinary is unavailable)
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/status', statusRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'OK', app: 'Chatzz Backend' }));

// Socket.io
socketHandler(io);

// Expose io to controllers via app
app.set('io', io);

// Global error handler
app.use((err, req, res, next) => {
  // Handle multer errors
  if (err instanceof multer.MulterError) {
    console.error('Multer error:', err.message);
    return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
  }
  // Handle Cloudinary errors
  if (err.message && err.message.includes('Cloudinary')) {
    console.error('Cloudinary error:', err.message);
    return res.status(400).json({ success: false, message: `Cloud storage error: ${err.message}` });
  }
  console.error('Server error:', err.stack || err.message);
  res.status(500).json({ success: false, message: err.message || 'Server Error' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Chatzz server running on port ${PORT}`);
});
