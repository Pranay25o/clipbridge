/**
 * controllers/cleanup.js
 * Clean up expired rooms and orphaned files
 */

const fs = require('fs');
const path = require('path');
const { getAllRooms, deleteRoom } = require('./roomStore');

const UPLOADS_DIR = path.join(__dirname, '../uploads');

async function deleteRoomFiles(roomId) {
  try {
    if (!fs.existsSync(UPLOADS_DIR)) return;

    const files = await fs.promises.readdir(UPLOADS_DIR);
    const roomFiles = files.filter(file => file.startsWith(roomId));

    for (const file of roomFiles) {
      const filePath = path.join(UPLOADS_DIR, file);
      try {
        await fs.promises.unlink(filePath);
        console.log(`🗑️ Deleted file: ${file}`);
      } catch (err) {
        console.error(`Failed to delete file ${file}:`, err);
      }
    }

    if (roomFiles.length > 0) {
      console.log(`✅ Deleted ${roomFiles.length} files for room ${roomId}`);
    }
  } catch (error) {
    console.error(`Error deleting files for room ${roomId}:`, error);
  }
}

async function cleanupExpiredRooms() {
  const now = Date.now();
  const rooms = getAllRooms();
  let deletedCount = 0;

  for (const room of rooms) {
    if (room.expiresAt && room.expiresAt <= now) {
      console.log(`🗑️ Cleaning up expired room: ${room.id}`);
      await deleteRoomFiles(room.id);
      deleteRoom(room.id);
      deletedCount++;
    } else if (!room.expiresAt && (now - room.lastActivity) > 2 * 60 * 60 * 1000) {
      console.log(`🗑️ Cleaning up inactive room: ${room.id}`);
      await deleteRoomFiles(room.id);
      deleteRoom(room.id);
      deletedCount++;
    }
  }

  if (deletedCount > 0) {
    console.log(`✅ Cleanup complete: ${deletedCount} rooms removed`);
  }

  await cleanupOrphanedFiles();
}

async function cleanupOrphanedFiles() {
  try {
    if (!fs.existsSync(UPLOADS_DIR)) return;

    const files = await fs.promises.readdir(UPLOADS_DIR);
    const existingRooms = new Set(getAllRooms().map(room => room.id));
    let orphanedCount = 0;

    for (const file of files) {
      const roomId = file.split('_')[0];
      if (!existingRooms.has(roomId)) {
        const filePath = path.join(UPLOADS_DIR, file);
        try {
          await fs.promises.unlink(filePath);
          orphanedCount++;
          console.log(`🗑️ Deleted orphaned file: ${file}`);
        } catch (err) {
          console.error(`Failed to delete orphaned file ${file}:`, err);
        }
      }
    }

    if (orphanedCount > 0) {
      console.log(`✅ Cleanup complete: ${orphanedCount} orphaned files removed`);
    }
  } catch (error) {
    console.error('Error cleaning up orphaned files:', error);
  }
}

module.exports = {
  deleteRoomFiles,
  cleanupExpiredRooms,
  cleanupOrphanedFiles,
};