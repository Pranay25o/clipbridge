/**
 * pages/RoomPage.js
 * Core workspace rendering user profiles, data transfers, and clipboard timelines.
 * 
 * CHANGES MADE:
 * - Fixed reload race-conditions by utilizing the context rehydration system.
 * - Guarded initialization hooks to prevent unintended redundant join event dispatches.
 * - Fully integrated the `handleEndRoom` closure with proper cleanups.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useRoom } from '../context/RoomContext';
import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';
import FileUploader from '../components/FileUploader';
import FileList from '../components/FileList';
import UserList from '../components/UserList';
import RoomTimer from '../components/RoomTimer';
import QRModal from '../components/QRModal';

export default function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { room, joinRoom, leaveRoom, userName, connected, isJoining, isOwner, endRoom } = useRoom();
  
  const [showQR, setShowQR] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('users');
  const [mobileTab, setMobileTab] = useState('chat');
  const [joinError, setJoinError] = useState(null);
  
  const hasJoinedRef = useRef(false);
  const joinAttemptedRef = useRef(false);

  // Sync current layout view defaults based on active mobile breakpoints
  useEffect(() => {
    if (mobileTab === 'files') {
      setSidebarTab('files');
    } else if (mobileTab === 'users') {
      setSidebarTab('users');
    }
  }, [mobileTab]);

  useEffect(() => {
    let isMounted = true;
    let timeoutId = null;
    
    const joinRoomHandler = async () => {
      // 1. Skip if already synced up cleanly
      if (room && room.id === roomId) {
        hasJoinedRef.current = true;
        joinAttemptedRef.current = true;
        return;
      }
      
      // 2. Skip duplicate processing loops
      if (hasJoinedRef.current || joinAttemptedRef.current || isJoining) {
        return;
      }
      
      // 3. Handle unauthenticated access loops
      if (!userName) {
        // Fall back check to see if a session rehydration is active before throwing out
        const activeSessionId = sessionStorage.getItem('clipbridge_active_room_id');
        if (activeSessionId === roomId) {
          return; // Let the core context mount process resolve this safely
        }
        
        console.log('No active user signature context found. Redirecting to initialization view.');
        navigate(`/?join=${roomId}`);
        return;
      }
      
      // 4. Dispatch the socket join sequence
      if (roomId && userName && !room) {
        try {
          joinAttemptedRef.current = true;
          setJoinError(null);
          console.log(`📡 Requesting room attachment channel: ${roomId}`);
          
          timeoutId = setTimeout(() => {
            if (isMounted && !room) {
              joinAttemptedRef.current = false;
              setJoinError('The connection timed out. Please try reloading the page.');
            }
          }, 15000);
          
          await joinRoom(roomId, userName);
          
          if (isMounted) {
            hasJoinedRef.current = true;
          }
        } catch (err) {
          console.error('Handshake verification failed:', err);
          if (isMounted) {
            setJoinError(err.message || 'Failed to authenticate connection.');
            hasJoinedRef.current = false;
            joinAttemptedRef.current = false;
            toast.error(err.message || 'Failed to connect to the session.');
            
            setTimeout(() => {
              if (isMounted) navigate('/');
            }, 3000);
          }
        } finally {
          if (timeoutId) clearTimeout(timeoutId);
        }
      }
    };
    
    const timer = setTimeout(() => {
      joinRoomHandler();
    }, 400);
    
    return () => {
      clearTimeout(timer);
      if (timeoutId) clearTimeout(timeoutId);
      isMounted = false;
    };
  }, [room, roomId, userName, joinRoom, navigate, isJoining]);

  const handleCopyRoomId = useCallback(() => {
    navigator.clipboard.writeText(roomId).then(() => {
      toast.success('Room ID copied to clipboard!');
    }).catch(() => {
      toast.disabled('Unable to copy text field automatically.');
    });
  }, [roomId]);

  const handleLeave = useCallback(() => {
    hasJoinedRef.current = false;
    joinAttemptedRef.current = false;
    leaveRoom();
    navigate('/');
    toast.success('Disconnected from session.');
  }, [leaveRoom, navigate]);

  const handleEndRoom = useCallback(async () => {
    try {
      await endRoom();
    } catch (err) {
      console.error('Could not cleanly terminate session:', err);
    }
  }, [endRoom]);

  // UI State Switchboards
  if (joinError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-card)]">
        <div className="text-center p-6 border border-red-500/20 rounded-xl bg-red-500/5 max-w-sm">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-400 font-mono text-sm mb-3 font-semibold">{joinError}</p>
          <p className="text-[var(--text-muted)] text-xs">Redirecting to the homepage...</p>
        </div>
      </div>
    );
  }

  if (isJoining || (!room && joinAttemptedRef.current)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--text-muted)] font-mono text-sm">Synchronizing workspace components...</p>
          <p className="text-[var(--text-muted)] text-xs mt-2 font-bold tracking-widest opacity-60">ID: {roomId}</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--text-muted)] font-mono text-sm">Preparing secure tunnel interfaces...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-card)] sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={handleLeave} className="btn-ghost px-2.5 py-1.5 text-xs flex items-center gap-1">
            ← Leave
          </button>
          
          {isOwner && (
            <>
              <div className="h-5 w-px bg-[var(--border)]" />
              <button 
                onClick={handleEndRoom} 
                className="px-2.5 py-1.5 text-xs flex items-center gap-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded border border-red-500/20 transition-colors font-medium"
                title="Destroy room lifecycle permanently"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
                End Room
              </button>
            </>
          )}
          
          <div className="h-5 w-px bg-[var(--border)]" />
          <button
            onClick={handleCopyRoomId}
            className="flex items-center gap-2 font-mono text-sm text-[var(--brand)] hover:opacity-80 transition-opacity"
            title="Click to copy room ID"
          >
            <span className="font-bold tracking-widest">{roomId}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {isOwner && (
            <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-medium">
              <span>👑</span>
              <span>Host Owner</span>
            </div>
          )}
          
          <RoomTimer />
          <button
            onClick={() => setShowQR(true)}
            className="btn-ghost px-2.5 py-1.5 text-xs flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
              <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
              <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
              <path d="M14 14h2v2h-2zM18 14h3v2h-3zM14 18h2v3h-2zM18 18h3v3h-3z" fill="currentColor"/>
            </svg>
            QR Access
          </button>

          <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
            connected
              ? 'border-[#00ff9d30] bg-[#00ff9d08] text-[var(--brand)] font-medium'
              : 'border-yellow-900 bg-yellow-950/30 text-yellow-400 font-medium'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-[var(--brand)] animate-pulse' : 'bg-yellow-400'}`} />
            {connected ? 'Sync Connected' : 'Re-establishing connection...'}
          </div>
        </div>
      </header>

      {/* Mobile Tab Control Panels */}
      <div className="flex md:hidden border-b border-[var(--border)] bg-[var(--bg-card)]">
        {['chat', 'files', 'users'].map(tab => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={`flex-1 py-2.5 text-xs capitalize font-medium transition-colors ${
              mobileTab === tab
                ? 'text-[var(--brand)] border-b-2 border-[var(--brand)]'
                : 'text-[var(--text-muted)]'
            }`}
          >
            {tab === 'chat' ? '💬 Chat Log' : tab === 'files' ? '📁 Shared Files' : '👥 Active Peers'}
          </button>
        ))}
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className={`flex-1 flex flex-col overflow-hidden ${mobileTab !== 'chat' ? 'hidden md:flex' : 'flex'}`}>
          <MessageList />
          <FileUploader />
          <MessageInput />
        </div>

        <aside className={`w-72 border-l border-[var(--border)] flex flex-col bg-[var(--bg-card)] ${
          mobileTab === 'chat' ? 'hidden md:flex' : 'flex w-full md:w-72'
        }`}>
          <div className="flex border-b border-[var(--border)]">
            {[
              { id: 'users', label: '👥 Room Users' },
              { id: 'files', label: '📁 Files Shared' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSidebarTab(tab.id)}
                className={`flex-1 py-3 text-xs font-medium transition-colors ${
                  sidebarTab === tab.id
                    ? 'text-[var(--brand)] border-b-2 border-[var(--brand)] -mb-px'
                    : 'text-[var(--text-muted)] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {sidebarTab === 'users' ? <UserList /> : <FileList />}
          </div>
        </aside>
      </div>

      {showQR && <QRModal onClose={() => setShowQR(false)} />}
    </div>
  );
}