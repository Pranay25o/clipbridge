import React from 'react';
import { useRoom } from '../context/RoomContext';

function formatTime(seconds) {
  if (seconds === null) return null;
  if (seconds <= 0) return '00:00';

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function RoomTimer() {
  const { timeLeft, room } = useRoom();

  if (!room?.expiresAt) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-mono">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
          <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        No expiry
      </div>
    );
  }

  if (timeLeft === null) return null;

  const isUrgent = timeLeft < 300; // < 5 min
  const isWarning = timeLeft < 1800; // < 30 min

  return (
    <div
      className={`flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded-full border ${
        isUrgent
          ? 'border-red-800 bg-red-950/30 text-red-400 timer-urgent'
          : isWarning
          ? 'border-yellow-800 bg-yellow-950/20 text-yellow-400'
          : 'border-[var(--border)] text-[var(--text-muted)]'
      }`}
      title="Room expires in"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
        <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      {formatTime(timeLeft)}
    </div>
  );
}
