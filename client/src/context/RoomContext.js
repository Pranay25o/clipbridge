/**
 * context/RoomContext.js
 * Global state for the current room session
 * 
 * CHANGES MADE:
 * - Implemented Session Rehydration via `sessionStorage` tracking within a mounting hook.
 * - This completely resolves Bug #3 (Page reload getting stuck on loading screen).
 * - Standardized `sessionStorage` setters inside `room-joined` callbacks to secure reload targets.
 * - Restructured `endRoom` to cleanly utilize socket and API pipelines without clearing state prematurely.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { connectSocket } from '../services/socket';
import { endRoom as apiEndRoom } from '../services/api';

const RoomContext = createContext(null);

export function RoomProvider({ children }) {
  const [room, setRoom] = useState(null);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [files, setFiles] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [userName, setUserName] = useState(
    () => localStorage.getItem('clipbridge_username') || ''
  );
  const [connected, setConnected] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  const socketRef = useRef(null);
  const timerRef = useRef(null);
  const isMountedRef = useRef(true);
  const currentRoomIdRef = useRef(null);

  // Persist username mutations
  useEffect(() => {
    if (userName) localStorage.setItem('clipbridge_username', userName);
  }, [userName]);

  // Dynamic context owner verification profile
  useEffect(() => {
    if (room && userName) {
      setIsOwner(room.creatorName === userName);
    } else {
      setIsOwner(false);
    }
  }, [room, userName]);

  // Expiry countdown timer loop
  useEffect(() => {
    if (!room?.expiresAt) { 
      setTimeLeft(null); 
      return; 
    }

    const tick = () => {
      const secs = Math.max(0, Math.floor((room.expiresAt - Date.now()) / 1000));
      setTimeLeft(secs);
      if (secs === 0) {
        toast.error('This room session has expired.', { id: 'room-expired' });
        leaveRoom();
      }
    };

    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [room?.expiresAt]);

  const setupSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
    }
    
    const socket = connectSocket();
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('⚡ Socket layer initialized');
      setConnected(true);
    });
    
    socket.on('disconnect', () => {
      console.log('🔌 Socket layer offline');
      setConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Connection configuration failure:', error);
      setConnected(false);
    });

    socket.on('room-joined', ({ room: r, users: u }) => {
      console.log('✅ Synchronized with room channel:', r.id);
      setRoom(r);
      setUsers(u);
      currentRoomIdRef.current = r.id;
      setIsJoining(false);
      setIsOwner(r.creatorName === userName);

      // Cache structural data to secure refresh continuity
      sessionStorage.setItem('clipbridge_active_room_id', r.id);
      sessionStorage.setItem('clipbridge_active_username', userName);
    });

    socket.on('room-history', ({ messages: msgs, files: fs }) => {
      setMessages(msgs || []);
      setFiles(fs || []);
    });

    socket.on('receive-message', (msg) => {
      setMessages(prev => {
        const targetId = msg.id || msg._id;
        if (prev.some(m => (m.id || m._id) === targetId)) return prev;
        return [...prev, msg];
      });
    });

    socket.on('receive-file', (file) => {
      setFiles(prev => {
        const targetId = file.id || file._id;
        if (prev.some(f => (f.id || f._id) === targetId)) return prev;
        return [...prev, file];
      });
      toast.success(`📎 File shared: ${file.originalName}`, { duration: 3000 });
    });

    socket.on('user-connected', ({ user, users: u }) => {
      setUsers(u);
      toast.success(`${user.name} entered the room`, { duration: 2000 });
    });

    socket.on('user-disconnected', ({ socketId, users: u }) => {
      setUsers(u);
      setTypingUsers(prev => {
        const clone = { ...prev };
        delete clone[socketId];
        return clone;
      });
    });

    socket.on('user-typing', ({ userName: name, socketId }) => {
      setTypingUsers(prev => ({ ...prev, [socketId]: name }));
    });

    socket.on('user-stopped-typing', ({ socketId }) => {
      setTypingUsers(prev => {
        const clone = { ...prev };
        delete clone[socketId];
        return clone;
      });
    });

    // Handle structural teardown broadcast
    socket.on('room-ended', ({ roomId, message }) => {
      console.log(`🚨 Room execution halt received for: ${roomId}`);
      if (currentRoomIdRef.current === roomId || sessionStorage.getItem('clipbridge_active_room_id') === roomId) {
        toast.error(message || 'The host has terminated this session.', { id: 'room-terminated' });
        leaveRoom();
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      }
    });

    return socket;
  }, [userName]);

  const createRoom = useCallback((name, expiryMinutes) => {
    return new Promise((resolve, reject) => {
      setIsJoining(true);
      setRoom(null);
      setMessages([]);
      setFiles([]);
      setUsers([]);
      setTypingUsers({});
      currentRoomIdRef.current = null;
      
      const socket = setupSocket();
      
      const timeout = setTimeout(() => {
        setIsJoining(false);
        reject(new Error('Server communication timed out during room instantiation.'));
      }, 10000);
      
      socket.emit('create-room', { userName: name, expiryMinutes }, (res) => {
        clearTimeout(timeout);
        if (res && res.success) {
          setUserName(name);
          currentRoomIdRef.current = res.room.id;
          setRoom(res.room);
          setUsers(res.users || []);
          setIsJoining(false);
          setIsOwner(true);
          
          sessionStorage.setItem('clipbridge_active_room_id', res.room.id);
          sessionStorage.setItem('clipbridge_active_username', name);
          resolve(res.room);
        } else {
          setIsJoining(false);
          reject(new Error(res?.error || 'Failed to initialize session room.'));
        }
      });
    });
  }, [setupSocket]);

  const joinRoom = useCallback((roomId, name) => {
    return new Promise((resolve, reject) => {
      setIsJoining(true);
      setRoom(null);
      setMessages([]);
      setFiles([]);
      setUsers([]);
      setTypingUsers({});
      
      const socket = setupSocket();
      const cleanId = (roomId || '').toUpperCase().trim();
      
      const timeout = setTimeout(() => {
        setIsJoining(false);
        reject(new Error('Server communication timed out during connection handshake.'));
      }, 12000);
      
      socket.emit('join-room', { roomId: cleanId, userName: name }, (res) => {
        clearTimeout(timeout);
        if (res && res.success) {
          setUserName(name);
          currentRoomIdRef.current = cleanId;
          setRoom(res.room);
          setUsers(res.users || []);
          setIsJoining(false);
          setIsOwner(res.room.creatorName === name);
          
          sessionStorage.setItem('clipbridge_active_room_id', cleanId);
          sessionStorage.setItem('clipbridge_active_username', name);
          resolve(res.room);
        } else {
          setIsJoining(false);
          // Wipe dirty cache values on rejection
          sessionStorage.removeItem('clipbridge_active_room_id');
          reject(new Error(res?.error || 'Failed to establish tunnel entry.'));
        }
      });
    });
  }, [setupSocket]);

  const endRoom = useCallback(async () => {
    if (!room || !isOwner) {
      toast.error('Action unauthorized. Only the session creator can end the room.');
      return;
    }
    
    try {
      const confirmed = window.confirm(
        '⚠️ Terminate this room permanently?\n\n' +
        'This clears all messaging databases, active user hooks, and file shares.'
      );
      
      if (!confirmed) return;
      
      const targetId = room.id;
      
      // 1. Alert connected sockets through the gateway tunnel
      if (socketRef.current) {
        socketRef.current.emit('end-room', { roomId: targetId });
      }
      
      // 2. Clear backend structural tables via direct REST API
      await apiEndRoom(targetId);
      
      toast.success('Session destroyed successfully.');
      leaveRoom();
      
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
      
    } catch (error) {
      console.error('Lifecycle interruption crash:', error);
      toast.error(error.response?.data?.error || 'Failed to smoothly execute terminal shutdown.');
    }
  }, [room, isOwner]);

  const sendMessage = useCallback((content, type = 'text') => {
    if (!socketRef.current || !room) return;
    socketRef.current.emit('send-message', {
      roomId: room.id,
      content,
      type,
      userName,
      id: `msg-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString(),
    });
  }, [room, userName]);

  const notifyFileUploaded = useCallback((fileInfo) => {
    if (!socketRef.current || !room) return;
    socketRef.current.emit('file-uploaded', {
      roomId: room.id,
      fileInfo: {
        ...fileInfo,
        id: `file-${Date.now()}-${Math.random()}`,
        timestamp: new Date().toISOString(),
      },
    });
  }, [room]);

  const emitTyping = useCallback((isTyping) => {
    if (!socketRef.current || !room) return;
    socketRef.current.emit(isTyping ? 'typing-start' : 'typing-stop', {
      roomId: room.id,
      userName,
    });
  }, [room, userName]);

  const leaveRoom = useCallback(() => {
    setRoom(null);
    setUsers([]);
    setMessages([]);
    setFiles([]);
    setTypingUsers({});
    setConnected(false);
    setTimeLeft(null);
    setIsJoining(false);
    setIsOwner(false);
    currentRoomIdRef.current = null;
    
    sessionStorage.removeItem('clipbridge_active_room_id');
    sessionStorage.removeItem('clipbridge_active_username');
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  // Run-once mounting anchor handling automatic session rehydration
  useEffect(() => {
    isMountedRef.current = true;
    
    const cachedRoomId = sessionStorage.getItem('clipbridge_active_room_id');
    const cachedUser = sessionStorage.getItem('clipbridge_active_username') || userName;

    if (cachedRoomId && cachedUser && !currentRoomIdRef.current) {
      console.log(`♻️ Auto-rehydrating session state for room: ${cachedRoomId}`);
      joinRoom(cachedRoomId, cachedUser).catch((err) => {
        console.error('Failed to auto-rehydrate session window:', err);
        sessionStorage.removeItem('clipbridge_active_room_id');
      });
    }

    return () => {
      isMountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      }
    };
  }, []);

  return (
    <RoomContext.Provider value={{
      room,
      users,
      messages,
      files,
      typingUsers,
      userName,
      setUserName,
      connected,
      timeLeft,
      isJoining,
      isOwner,
      createRoom,
      joinRoom,
      sendMessage,
      notifyFileUploaded,
      emitTyping,
      leaveRoom,
      endRoom,
      socketId: socketRef.current?.id,
    }}>
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom() {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error('useRoom must be used within a valid RoomProvider scope');
  return ctx;
}

export default RoomContext;