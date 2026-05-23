/**
 * middleware/upload.js
 * Multer configuration for file uploads
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Allowed MIME types
const ALLOWED_TYPES = new Set([
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  // Documents
  'application/pdf',
  'text/plain', 'text/markdown', 'text/csv', 'text/html', 'text/css',
  // Code
  'application/json', 'application/xml',
  // Archives
  'application/zip', 'application/x-zip-compressed',
  'application/x-tar', 'application/gzip',
  // Scripts / code (sent as text/plain usually)
  'application/octet-stream',
  'application/x-python-code',
  'application/javascript',
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Store with UUID prefix to avoid collisions
    const ext = path.extname(file.originalname);
    const storedName = `${uuidv4()}${ext}`;
    cb(null, storedName);
  },
});

const fileFilter = (req, file, cb) => {
  // Block potentially dangerous files
  const dangerousExts = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.msi', '.dll'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (dangerousExts.includes(ext)) {
    return cb(new Error(`File type ${ext} is not allowed for security reasons`), false);
  }

  cb(null, true);
};

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '50') * 1024 * 1024; // Default 50MB

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 5, // max 5 files per upload
  },
});

module.exports = { upload, UPLOADS_DIR };
