/**
 * routes/rooms.js
 * REST endpoints for room checking, QR code generation, and host teardown closures.
 * 
 * CHANGES MADE:
 * - FIXED: Changed destructured require() to clean object-level module loading (`roomStore`).
 * - This prevents the early initialization race condition causing "createRoom is not a function".
 * - Updated internal route handlers to safely access methods through the `roomStore` wrapper.
 */

const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');

// SAFE IMPORT: Reference the parent object directly to avoid undefined destructuring crashes
const roomStore = require('../controllers/roomStore');

// GET /api/rooms/:id - Check if a room exists
router.get('/:id', (req, res) => {
  const roomId = req.params.id.toUpperCase().trim();

  if (!roomStore.isRoomValid(roomId)) {
    return res.status(404).json({ success: false, error: 'Room not found or expired' });
  }

  const room = roomStore.getRoom(roomId);
  res.json({
    success: true,
    room: {
      id: room.id,
      createdAt: room.createdAt,
      expiresAt: room.expiresAt,
      expiryMinutes: room.expiryMinutes,
      userCount: room.users ? room.users.size : 0,
    },
  });
});

// GET /api/rooms/:id/qr - Get QR code for room
router.get('/:id/qr', async (req, res) => {
  const roomId = req.params.id.toUpperCase().trim();

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const roomUrl = `${clientUrl}/room/${roomId}`;

  try {
    const qrDataUrl = await QRCode.toDataURL(roomUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#00ff9d',
        light: '#0a0a0f',
      },
    });

    res.json({ success: true, qrCode: qrDataUrl, url: roomUrl });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to generate QR code' });
  }
});

// DELETE /api/rooms/:id - End room
router.delete('/:id', async (req, res) => {
  const roomId = req.params.id.toUpperCase().trim();

  try {
    if (!roomStore.isRoomValid(roomId)) {
      return res.status(404).json({ success: false, error: 'Room not found or already expired' });
    }

    console.log(`[API] Terminating room execution: ${roomId}`);

    // Retrieve the socket instance cleanly without circular dependencies
    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('room-ended', {
        roomId,
        message: 'The host has terminated this session via API route.',
      });
    }

    // Wipe room structural state from memory layer cleanly
    roomStore.deleteRoom(roomId);

    res.json({ success: true, message: 'Room ended successfully', roomId });
  } catch (error) {
    console.error(`[API] Error ending room processing loop:`, error);
    res.status(500).json({ success: false, error: 'Failed to end room' });
  }
});

module.exports = router;