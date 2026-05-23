/**
 * routes/files.js
 * File upload and download endpoints
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { upload, UPLOADS_DIR } = require('../middleware/upload');
const { isRoomValid, addFile } = require('../controllers/roomStore');

// POST /api/files/upload/:roomId - Upload files to a room
router.post('/upload/:roomId', upload.array('files', 5), (req, res) => {
  const roomId = req.params.roomId.toUpperCase().trim();

  if (!isRoomValid(roomId)) {
    // Clean up uploaded files if room is invalid
    if (req.files) {
      req.files.forEach(f => {
        try { fs.unlinkSync(f.path); } catch (e) {}
      });
    }
    return res.status(404).json({ success: false, error: 'Room not found or expired' });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, error: 'No files uploaded' });
  }

  const uploadedFiles = req.files.map(file => {
    const fileRecord = addFile(roomId, {
      originalName: file.originalname,
      storedName: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      uploadedBy: req.body.userName || 'Anonymous',
      url: `/uploads/${file.filename}`,
    });
    return fileRecord;
  });

  res.json({
    success: true,
    files: uploadedFiles,
  });
});

// GET /api/files/:filename - Download a file
router.get('/:filename', (req, res) => {
  const filename = req.params.filename;
  // Basic validation: only alphanumeric, dash, dot, underscore
  if (!/^[\w\-\.]+$/.test(filename)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  const filePath = path.join(UPLOADS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found or expired' });
  }

  res.download(filePath);
});

// Multer error handling
router.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: `File too large. Max size is ${process.env.MAX_FILE_SIZE || 50}MB`,
    });
  }
  if (err.message) {
    return res.status(400).json({ success: false, error: err.message });
  }
  next(err);
});

module.exports = router;
