import React from 'react';
import { useRoom } from '../context/RoomContext';

// Generate a consistent color from a name
function nameToColor(name) {
  const colors = [
    '#00ff9d', '#00d4ff', '#ff6b6b', '#ffd93d', '#a855f7',
    '#f97316', '#06b6d4', '#84cc16', '#f43f5e', '#8b5cf6',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function UserList() {
  const { users, userName, socketId, room } = useRoom();

  return (
    <div className="py-3">
      <p className="text-xs text-[var(--text-muted)] font-mono px-3 mb-3">
        {users.length} online
      </p>

      {users.map(user => {
        const color = nameToColor(user.name);
        const isSelf = user.id === socketId;
        const isCreator = user.name === room?.creatorName;

        return (
          <div
            key={user.id}
            className="flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--bg-card-hover)] transition-colors"
          >
            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ background: `${color}20`, border: `1px solid ${color}40`, color }}
            >
              {user.name[0].toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-white truncate">{user.name}</span>
                {isSelf && (
                  <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-card)] px-1.5 py-0.5 rounded">
                    you
                  </span>
                )}
                {isCreator && (
                  <span className="text-xs" title="Room creator">👑</span>
                )}
              </div>
            </div>

            {/* Online indicator */}
            <span
              className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse-slow"
              style={{ background: color }}
            />
          </div>
        );
      })}

      {users.length === 0 && (
        <div className="text-center text-xs text-[var(--text-muted)] py-6">
          No users connected
        </div>
      )}
    </div>
  );
}
