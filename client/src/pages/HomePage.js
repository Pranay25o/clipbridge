import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useRoom } from '../context/RoomContext';

const EXPIRY_OPTIONS = [
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 1440, label: '24 hours' },
  { value: 0, label: 'Never' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { createRoom, joinRoom, userName, setUserName } = useRoom();

  const [joinCode, setJoinCode] = useState('');
  const [expiryMinutes, setExpiryMinutes] = useState(60);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('create'); // 'create' | 'join'
  const [nameInput, setNameInput] = useState(userName || '');

  const handleCreate = async (e) => {
    e.preventDefault();
    const name = nameInput.trim() || `User_${Math.floor(Math.random() * 9000) + 1000}`;
    setLoading(true);
    try {
      const room = await createRoom(name, expiryMinutes);
      toast.success('Room created!');
      navigate(`/room/${room.id}`);
    } catch (err) {
      toast.error(err.message || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return toast.error('Enter a room code');
    const name = nameInput.trim() || `User_${Math.floor(Math.random() * 9000) + 1000}`;
    setLoading(true);
    try {
      await joinRoom(code, name);
      navigate(`/room/${code}`);
    } catch (err) {
      toast.error(err.message || 'Room not found or expired');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid-bg flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--brand)] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="#050508" strokeWidth="2" strokeLinecap="round"/>
              <path d="M9 12h6M9 16h4" stroke="#050508" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="font-display font-700 text-lg tracking-tight text-white">
            Clip<span className="text-[var(--brand)]">Bridge</span>
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span className="w-2 h-2 rounded-full bg-[var(--brand)] inline-block animate-pulse" />
          Cross-device sharing
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center mb-12 max-w-2xl">
          {/* Glowing badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#00ff9d30] bg-[#00ff9d08] text-[var(--brand)] text-xs font-mono mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] animate-pulse" />
            Instant. Temporary. Secure.
          </div>

          <h1 className="font-display text-5xl font-bold leading-tight mb-4 text-white">
            Share anything<br />
            <span className="text-[var(--brand)] glow-brand-text">across every device</span>
          </h1>

          <p className="text-[var(--text-muted)] text-lg leading-relaxed">
            Drop text, code, files, and images into a room — instantly synced to
            Windows, Ubuntu, Jetson Nano, Raspberry Pi, or any browser.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {['📋 Clipboard sync', '📁 File transfer', '🖼️ Image preview', '⌨️ Code sharing', '📱 QR join', '⏱️ Auto-expire'].map(f => (
              <span key={f} className="px-3 py-1 rounded-full bg-[var(--bg-card)] border border-[var(--border)] text-sm text-[var(--text-muted)]">
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="w-full max-w-md">
          <div className="card p-1">
            {/* Tabs */}
            <div className="flex rounded-[10px] bg-[#080810] p-1 mb-4 mx-0">
              {['create', 'join'].map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                    tab === t
                      ? 'bg-[var(--bg-card)] text-white border border-[var(--border)]'
                      : 'text-[var(--text-muted)] hover:text-white'
                  }`}
                >
                  {t === 'create' ? '+ Create Room' : '→ Join Room'}
                </button>
              ))}
            </div>

            <div className="p-4 pt-0">
              {/* Name input (shared) */}
              <div className="mb-4">
                <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-mono">
                  Your Display Name
                </label>
                <input
                  className="input-field w-full px-3 py-2.5 text-sm"
                  placeholder="e.g. RaspberryPi-Zero or DevLaptop"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                />
              </div>

              {tab === 'create' ? (
                <form onSubmit={handleCreate}>
                  <div className="mb-4">
                    <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-mono">
                      Room Expiry
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {EXPIRY_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setExpiryMinutes(opt.value)}
                          className={`py-2 px-3 rounded-lg text-sm border transition-all ${
                            expiryMinutes === opt.value
                              ? 'border-[var(--brand)] text-[var(--brand)] bg-[#00ff9d10]'
                              : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[#00ff9d40]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-[#050508] border-t-transparent rounded-full animate-spin" />
                        Creating…
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                        </svg>
                        Create Room
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleJoin}>
                  <div className="mb-4">
                    <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-mono">
                      Room Code
                    </label>
                    <input
                      className="input-field w-full px-3 py-2.5 text-sm font-mono tracking-widest uppercase"
                      placeholder="XXX-XXX"
                      value={joinCode}
                      onChange={e => setJoinCode(e.target.value.toUpperCase())}
                      maxLength={7}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !joinCode.trim()}
                    className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-[#050508] border-t-transparent rounded-full animate-spin" />
                        Joining…
                      </>
                    ) : 'Join Room →'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl w-full">
          {[
            { icon: '🏠', title: 'Create a room', desc: 'One click to generate a unique room with auto-expiry' },
            { icon: '📱', title: 'Scan & join', desc: 'Other devices scan QR or enter the 7-char code' },
            { icon: '⚡', title: 'Share instantly', desc: 'Text, files, images sync in real-time via WebSockets' },
          ].map(step => (
            <div key={step.title} className="card p-4 text-center">
              <div className="text-2xl mb-2">{step.icon}</div>
              <div className="font-medium text-white text-sm mb-1">{step.title}</div>
              <div className="text-xs text-[var(--text-muted)]">{step.desc}</div>
            </div>
          ))}
        </div>
      </main>

      <footer className="text-center py-4 text-xs text-[var(--text-muted)] border-t border-[var(--border)]">
        ClipBridge — ephemeral sharing for developers
      </footer>
    </div>
  );
}
