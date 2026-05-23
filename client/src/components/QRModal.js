import React, { useEffect, useState } from 'react';
import { useRoom } from '../context/RoomContext';
import { getRoomQR } from '../services/api';
import toast from 'react-hot-toast';

export default function QRModal({ onClose }) {
  const { room } = useRoom();
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!room) return;
    getRoomQR(room.id)
      .then(setQrData)
      .catch(() => toast.error('Failed to generate QR'))
      .finally(() => setLoading(false));
  }, [room]);

  const handleCopyLink = () => {
    if (qrData?.url) {
      navigator.clipboard.writeText(qrData.url).then(() => {
        toast.success('Link copied!');
      });
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="card p-6 max-w-sm w-full text-center"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-white font-semibold">Join via QR Code</h3>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="w-48 h-48 mx-auto flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : qrData ? (
          <>
            <div className="bg-[#0a0a0f] p-4 rounded-xl inline-block mb-4 border border-[var(--border)]">
              <img src={qrData.qrCode} alt="Room QR Code" className="w-48 h-48" />
            </div>

            <p className="text-xs text-[var(--text-muted)] mb-3">
              Scan to join on another device
            </p>

            <div className="flex items-center gap-2 bg-[#080810] rounded-lg p-2 mb-3">
              <span className="font-mono text-xs text-[var(--brand)] flex-1 truncate">
                {qrData.url}
              </span>
              <button onClick={handleCopyLink} className="text-[var(--text-muted)] hover:text-[var(--brand)] transition-colors flex-shrink-0 text-xs">
                Copy
              </button>
            </div>

            <div className="flex items-center gap-2 bg-[#080810] rounded-lg p-2">
              <span className="text-xs text-[var(--text-muted)]">Room code:</span>
              <span className="font-mono text-sm text-[var(--brand)] font-bold tracking-widest">
                {room?.id}
              </span>
            </div>
          </>
        ) : (
          <p className="text-[var(--text-muted)] text-sm">Failed to load QR code</p>
        )}
      </div>
    </div>
  );
}
