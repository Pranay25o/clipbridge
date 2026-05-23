/**
 * ClipBridge Server
 * Real-time cross-device clipboard & file sharing
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const cron = require('node-cron');

const roomRoutes = require('./routes/rooms');
const fileRoutes = require('./routes/files');
const { initSocketHandlers } = require('./socket/handlers');
const { cleanupExpiredRooms, cleanupExpiredFiles } = require('./controllers/cleanup');

const app = express();
const server = http.createServer(app);

// ── Allowed Origins Configuration (FIXED FOR VERCEL) ──────────────────────────
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'https://clipbridge.vercel.app',
  'https://clipbridge-eight.vercel.app',
  'https://clipbridge-9p2u.vercel.app',
  /\.vercel\.app$/  // This allows ANY Vercel preview URL automatically
];

// ── Socket.IO Setup ────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  maxHttpBufferSize: 1e8, // 100 MB for file transfers
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Avoid circular dependencies by passing io to express configuration pool
app.set('io', io);

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Create uploads directory if it doesn't exist
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Uploads directory created');
}

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// ── MongoDB Connection ─────────────────────────────────────────────────────────
const connectDB = async () => {
  try {
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ MongoDB connected');
    } else {
      console.log('⚠️  No MONGODB_URI found — running in memory-only mode');
    }
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('⚠️  Falling back to in-memory mode');
  }
};

connectDB();

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use('/api/rooms', roomRoutes);
app.use('/api/files', fileRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    cors: 'enabled'
  });
});

// Root endpoint - helpful for testing
app.get('/', (req, res) => {
  res.json({
    message: '🎉 ClipBridge API is running!',
    endpoints: {
      health: '/api/health',
      rooms: '/api/rooms/:id',
      qr: '/api/rooms/:id/qr',
      upload: '/api/files/upload/:roomId',
      download: '/api/files/:filename'
    },
    status: 'online',
    cors_origins_allowed: allowedOrigins
  });
});

// ── Socket Handlers ────────────────────────────────────────────────────────────
initSocketHandlers(io);

// ── Cron: Cleanup every N minutes ─────────────────────────────────────────────
const CLEANUP_INTERVAL = parseInt(process.env.CLEANUP_INTERVAL || '5');
cron.schedule(`*/${CLEANUP_INTERVAL} * * * *`, () => {
  console.log('🧹 Running scheduled cleanup...');
  cleanupExpiredRooms();
  cleanupExpiredFiles();
});

// ── Start Server ───────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║         ClipBridge Server             ║
║  🚀 Running on port ${PORT}               ║
║  🔗 ${process.env.CLIENT_URL || 'http://localhost:3000'}     ║
║  ✅ CORS enabled for Vercel           ║
╚═══════════════════════════════════════╝
  `);
});

// App instance export
module.exports = app;