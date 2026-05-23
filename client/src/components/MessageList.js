import React, { useEffect, useRef } from 'react';
import { useRoom } from '../context/RoomContext';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import toast from 'react-hot-toast';

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function MessageBubble({ msg, isSelf }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content).then(() => {
      toast.success('Copied to clipboard!', { duration: 1500 });
    });
  };

  const isCode = msg.type === 'code' || msg.type === 'command';

  return (
    <div className={`flex gap-2 group ${isSelf ? 'flex-row-reverse' : 'flex-row'} mb-3 animate-slide-up`}>
      {/* Avatar */}
      <div className="w-7 h-7 rounded-full bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center text-xs font-mono flex-shrink-0 mt-0.5">
        {(msg.userName || 'U')[0].toUpperCase()}
      </div>

      <div className={`max-w-[75%] ${isSelf ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        {/* Name + time */}
        <div className={`flex items-center gap-2 text-xs text-[var(--text-muted)] ${isSelf ? 'flex-row-reverse' : ''}`}>
          <span className={isSelf ? 'text-[var(--brand)]' : 'text-[#8888bb]'}>{msg.userName}</span>
          <span>{formatTime(msg.timestamp)}</span>
        </div>

        {/* Bubble */}
        <div className={`relative rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isSelf ? 'msg-self rounded-tr-sm' : 'msg-other rounded-tl-sm'
        } ${isCode ? 'p-0 overflow-hidden' : ''}`}>
          {isCode ? (
            <div>
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#1a1a2e] text-xs text-[var(--text-muted)] border-b border-[var(--border)]">
                <span className="font-mono text-[var(--brand)]">
                  {msg.type === 'command' ? '$ terminal' : '<> code'}
                </span>
                <button
                  onClick={handleCopy}
                  className="hover:text-white transition-colors"
                  title="Copy"
                >
                  Copy
                </button>
              </div>
              <SyntaxHighlighter
                language={msg.type === 'command' ? 'bash' : 'javascript'}
                style={vscDarkPlus}
                customStyle={{ margin: 0, fontSize: '12px', background: 'transparent' }}
              >
                {msg.content}
              </SyntaxHighlighter>
            </div>
          ) : (
            <span className="whitespace-pre-wrap break-words">{msg.content}</span>
          )}

          {/* Copy button (non-code) */}
          {!isCode && (
            <button
              onClick={handleCopy}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[var(--bg-card)] border border-[var(--border)] items-center justify-center hidden group-hover:flex text-[var(--text-muted)] hover:text-[var(--brand)] transition-colors"
              title="Copy"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator({ names }) {
  if (names.length === 0) return null;
  const label = names.length === 1
    ? `${names[0]} is typing`
    : `${names.join(', ')} are typing`;

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-xs text-[var(--text-muted)]">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] typing-dot" />
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] typing-dot" />
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] typing-dot" />
      </div>
      <span>{label}</span>
    </div>
  );
}

export default function MessageList() {
  const { messages, typingUsers, socketId } = useRoom();
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const typingNames = Object.entries(typingUsers)
    .filter(([sid]) => sid !== socketId)
    .map(([, name]) => name);

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-[var(--text-muted)] text-sm">
            No messages yet. Share something!
          </p>
          <p className="text-[var(--text-muted)] text-xs mt-1">
            Text, code snippets, commands, or files
          </p>
        </div>
      ) : (
        messages.map(msg => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            isSelf={msg.senderId === socketId}
          />
        ))
      )}
      <TypingIndicator names={typingNames} />
      <div ref={bottomRef} />
    </div>
  );
}
