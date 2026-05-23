/**
 * ClipBridge Server
 * Real-time cross-device clipboard & file sharing
 * 
 * CHANGES MADE:
 * - Mounted the `io` instance onto Express using `app.set('io', io)`.
 * - This elegant architecture pattern eliminates circular dependencies entirely, allowing
 *   REST routes (like rooms.js for the End Room feature) to cleanly broadcast messages.
 * - Added a standard pre-flight/CORS handler validation profile.
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

// ── Socket.IO Setup ────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'DELETE'], // Allowed methods for handling deletions
    credentials: true,
  },
  maxHttpBufferSize: 1e8, // 100 MB for file transfers
});

// Avoid circular dependencies by passing io to express configuration pool
app.set('io', io);

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
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
╚═══════════════════════════════════════╝
  `);
});

// App instance export
module.exports = app;