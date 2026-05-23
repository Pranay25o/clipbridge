import React, { useState, useRef, useCallback } from 'react';
import { useRoom } from '../context/RoomContext';
import toast from 'react-hot-toast';

const MSG_TYPES = [
  { id: 'text', label: 'Text', icon: '💬' },
  { id: 'code', label: 'Code', icon: '</>' },
  { id: 'command', label: 'CMD', icon: '$' },
];

export default function MessageInput() {
  const { sendMessage, emitTyping, room } = useRoom();
  const [value, setValue] = useState('');
  const [msgType, setMsgType] = useState('text');
  const typingTimer = useRef(null);
  const isTyping = useRef(false);

  const handleTyping = useCallback((e) => {
    setValue(e.target.value);

    if (!isTyping.current) {
      isTyping.current = true;
      emitTyping(true);
    }

    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      isTyping.current = false;
      emitTyping(false);
    }, 1500);
  }, [emitTyping]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || !room) return;

    sendMessage(trimmed, msgType);
    setValue('');
    isTyping.current = false;
    emitTyping(false);
    clearTimeout(typingTimer.current);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setValue(text);
        toast.success('Pasted from clipboard', { duration: 1500 });
      }
    } catch {
      toast.error('Clipboard access denied');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (msgType === 'text' ? !e.shiftKey : e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const placeholder = {
    text: 'Type a message… (Enter to send)',
    code: 'Paste code here… (Ctrl+Enter to send)',
    command: 'Enter terminal command… (Ctrl+Enter to send)',
  }[msgType];

  return (
    <div className="border-t border-[var(--border)] p-3 bg-[var(--bg-card)]">
      {/* Type selector */}
      <div className="flex items-center gap-1 mb-2">
        {MSG_TYPES.map(t => (
          <button
            key={t.id}
            onClick={() => setMsgType(t.id)}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
              msgType === t.id
                ? 'bg-[#00ff9d15] text-[var(--brand)] border border-[#00ff9d40]'
                : 'text-[var(--text-muted)] hover:text-white'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}

        <div className="flex-1" />

        <button
          onClick={handlePaste}
          className="btn-ghost px-2 py-1 text-xs flex items-center gap-1"
          title="Paste from clipboard"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Paste
        </button>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <textarea
          className={`input-field flex-1 px-3 py-2.5 text-sm resize-none ${
            msgType !== 'text' ? 'font-mono text-xs' : ''
          }`}
          placeholder={placeholder}
          value={value}
          onChange={handleTyping}
          onKeyDown={handleKeyDown}
          rows={msgType === 'text' ? 1 : 3}
          style={{ lineHeight: '1.5' }}
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className="btn-primary px-4 py-2 text-sm self-end flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Send
        </button>
      </form>
    </div>
  );
}
