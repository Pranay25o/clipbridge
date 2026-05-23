/**
 * socket/handlers.js
 * All Socket.IO event handlers for ClipBridge
 * 
 * CHANGES MADE:
 * - Refactored imports to reference the root `roomStore` object directly inside events.
 * - This resolves the critical "createRoom is not a function" initialization race condition.
 * - Robust error handling added for safe execution fallback if callbacks are missing.
 * - Enhanced the 'end-room' structural logic to force disconnect sockets from the room channel.
 */

// Import the module object safely
const roomStore = require('../controllers/roomStore');

// Log to verify initial connection
console.log('✅ Socket handlers loaded successfully');
console.log('📦 roomStore module check:', typeof roomStore === 'object' ? 'OK' : 'FAIL');

const socketRoomMap = new Map();

function initSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // CREATE ROOM
    socket.on('create-room', ({ userName, expiryMinutes = 60 }, callback) => {
      console.log('📝 Create room request for:', userName);
      
      // Ensure absolute fallback if callback isn't supplied by client
      const reply = typeof callback === 'function' ? callback : () => {};
      
      try {
        // Dynamic evaluation prevents undefined reference errors on runtime mutations
        if (!roomStore || typeof roomStore.createRoom !== 'function') {
          throw new Error('createRoom is not a function on the roomStore module! Check module bindings.');
        }
        
        const room = roomStore.createRoom(userName, expiryMinutes);
        
        if (!room || !room.id) {
          throw new Error('Failed to create room - roomStore returned an invalid object.');
        }
        
        socket.join(room.id);
        socketRoomMap.set(socket.id, room.id);
        roomStore.addUserToRoom(room.id, socket.id, userName);

        console.log(`🏠 Room created: ${room.id} by ${userName}`);

        const roomData = {
          id: room.id,
          creatorName: room.creatorName,
          createdAt: room.createdAt,
          expiresAt: room.expiresAt,
          expiryMinutes: room.expiryMinutes,
        };

        // Complete response mapping back to source connection
        reply({
          success: true,
          room: roomData,
          users: roomStore.getRoomUsers(room.id),
        });

        socket.emit('room-joined', {
          room: roomData,
          users: roomStore.getRoomUsers(room.id),
        });
        
      } catch (err) {
        console.error('❌ Create room error:', err);
        reply({ 
          success: false, 
          error: err.message || 'Failed to create room structure' 
        });
      }
    });

    // JOIN ROOM
    socket.on('join-room', ({ roomId, userName }, callback) => {
      const reply = typeof callback === 'function' ? callback : () => {};
      try {
        const cleanId = (roomId || '').toUpperCase().trim();

        if (!roomStore.isRoomValid(cleanId)) {
          return reply({ success: false, error: 'Room not found or has expired' });
        }

        const room = roomStore.getRoom(cleanId);
        socket.join(cleanId);
        socketRoomMap.set(socket.id, cleanId);
        const user = roomStore.addUserToRoom(cleanId, socket.id, userName);

        console.log(`👋 ${userName} joined room ${cleanId}`);

        const roomData = {
          id: room.id,
          creatorName: room.creatorName,
          createdAt: room.createdAt,
          expiresAt: room.expiresAt,
          expiryMinutes: room.expiryMinutes,
        };

        reply({
          success: true,
          room: roomData,
          users: roomStore.getRoomUsers(cleanId),
        });

        socket.to(cleanId).emit('user-connected', {
          user,
          users: roomStore.getRoomUsers(cleanId),
        });

        socket.emit('room-history', {
          messages: room.messages || [],
          files: room.files || [],
        });

        socket.emit('room-joined', {
          room: roomData,
          users: roomStore.getRoomUsers(cleanId),
        });
      } catch (err) {
        console.error('❌ Join room error:', err);
        reply({ success: false, error: err.message });
      }
    });

    // SEND MESSAGE
    socket.on('send-message', ({ roomId, content, type = 'text', userName }) => {
      if (!roomStore.isRoomValid(roomId)) return;

      const msg = roomStore.addMessage(roomId, {
        content,
        type,
        userName,
        senderId: socket.id,
      });

      if (msg) {
        io.to(roomId).emit('receive-message', msg);
        roomStore.touchRoom(roomId);
      }
    });

    // TYPING INDICATORS
    socket.on('typing-start', ({ roomId, userName }) => {
      socket.to(roomId).emit('user-typing', { userName, socketId: socket.id });
    });

    socket.on('typing-stop', ({ roomId }) => {
      socket.to(roomId).emit('user-stopped-typing', { socketId: socket.id });
    });

    // FILE UPLOADED
    socket.on('file-uploaded', ({ roomId, fileInfo }) => {
      if (!roomStore.isRoomValid(roomId)) return;

      const file = roomStore.addFile(roomId, fileInfo);
      if (file) {
        io.to(roomId).emit('receive-file', file);
        roomStore.touchRoom(roomId);
      }
    });

    // END ROOM
    socket.on('end-room', ({ roomId }) => {
      try {
        const cleanId = (roomId || '').toUpperCase().trim();

        if (!roomStore.isRoomValid(cleanId)) {
          console.log(`❌ Cannot end room ${cleanId}: Target not found or inactive`);
          return;
        }

        console.log(`🚨 Room ${cleanId} is being terminated by the host`);

        // Notify all clients connected to this specific channel
        io.to(cleanId).emit('room-ended', {
          roomId: cleanId,
          message: 'The host has terminated this session.',
        });

        // Forcefully un-join all active sockets from the Socket.io room pool
        const matchingSockets = io.sockets.adapter.rooms.get(cleanId);
        if (matchingSockets) {
          for (const socketId of matchingSockets) {
            const clientSocket = io.sockets.sockets.get(socketId);
            if (clientSocket) {
              clientSocket.leave(cleanId);
              socketRoomMap.delete(socketId);
            }
          }
        }

        // Wipe clean from the memory layer
        roomStore.deleteRoom(cleanId);
        console.log(`✅ Room ${cleanId} wiped clean completely`);
      } catch (error) {
        console.error(`❌ Error ending room lifecycle:`, error);
      }
    });

    // DISCONNECT
    socket.on('disconnect', () => {
      const roomId = socketRoomMap.get(socket.id);
      if (roomId) {
        roomStore.removeUserFromRoom(roomId, socket.id);
        socketRoomMap.delete(socket.id);

        io.to(roomId).emit('user-disconnected', {
          socketId: socket.id,
          users: roomStore.getRoomUsers(roomId),
        });
      }
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });
}

module.exports = { initSocketHandlers };