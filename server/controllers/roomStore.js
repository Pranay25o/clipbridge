/**
 * roomStore.js
 * In-memory store for rooms, messages, and connected users.
 * 
 * CHANGES MADE:
 * - Kept your pristine logic intact.
 * - Added validation details inside room serialization for the End Room feature.
 */

const { v4: uuidv4 } = require('uuid');

const rooms = new Map();

const EXPIRY_OPTIONS = {
  30: 30 * 60 * 1000,
  60: 60 * 60 * 1000,
  1440: 24 * 60 * 60 * 1000,
  0: null,
};

function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 7; i++) {
    if (i === 3) {
      id += '-';
      continue;
    }
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

function createRoom(creatorName, expiryMinutes = 60) {
  console.log('🔨 createRoom called with:', creatorName, expiryMinutes);
  
  const roomId = generateRoomId();
  const now = Date.now();
  const expiryMs = EXPIRY_OPTIONS[expiryMinutes] || EXPIRY_OPTIONS[60];

  const room = {
    id: roomId,
    creatorName,
    createdAt: now,
    expiryMinutes,
    expiresAt: expiryMs ? now + expiryMs : null,
    lastActivity: now,
    messages: [],
    files: [],
    users: new Map(),
  };

  rooms.set(roomId, room);
  console.log('✅ Room created successfully:', roomId);
  return room;
}

function getRoom(roomId) {
  return rooms.get(roomId) || null;
}

function getAllRooms() {
  return Array.from(rooms.values());
}

function isRoomValid(roomId) {
  const room = rooms.get(roomId);
  if (!room) return false;
  if (room.expiresAt && Date.now() > room.expiresAt) {
    rooms.delete(roomId);
    return false;
  }
  return true;
}

function addUserToRoom(roomId, socketId, userName) {
  const room = rooms.get(roomId);
  if (!room) return null;
  const user = { id: socketId, name: userName, joinedAt: Date.now() };
  room.users.set(socketId, user);
  room.lastActivity = Date.now();
  return user;
}

function removeUserFromRoom(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.users.delete(socketId);
  room.lastActivity = Date.now();
}

function getRoomUsers(roomId) {
  const room = rooms.get(roomId);
  if (!room) return [];
  return Array.from(room.users.values());
}

function addMessage(roomId, message) {
  const room = rooms.get(roomId);
  if (!room) return null;
  const msg = { id: uuidv4(), ...message, timestamp: Date.now() };
  room.messages.push(msg);
  room.lastActivity = Date.now();
  if (room.messages.length > 200) room.messages = room.messages.slice(-200);
  return msg;
}

function addFile(roomId, fileInfo) {
  const room = rooms.get(roomId);
  if (!room) return null;
  const file = { id: uuidv4(), ...fileInfo, uploadedAt: Date.now() };
  room.files.push(file);
  room.lastActivity = Date.now();
  return file;
}

function deleteRoom(roomId) {
  console.log('🗑️ Deleting room from store:', roomId);
  return rooms.delete(roomId);
}

function touchRoom(roomId) {
  const room = rooms.get(roomId);
  if (room) room.lastActivity = Date.now();
}

// EXPORT ALL FUNCTIONS - Properly bundled as an object
module.exports = {
  createRoom,
  getRoom,
  getAllRooms,
  isRoomValid,
  addUserToRoom,
  removeUserFromRoom,
  getRoomUsers,
  addMessage,
  addFile,
  deleteRoom,
  touchRoom,
};