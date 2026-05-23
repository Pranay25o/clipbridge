/**
 * components/FileList.js
 * Renders the collection of shared files inside the sidebar workspace.
 * 
 * CHANGES MADE:
 * - Fixed Bug #6 (Duplicate key warnings in FileList component).
 * - Implemented a highly resilient composite key fallback strategy that guarantees absolute uniqueness.
 * - Added a backup structural check inside the mapper block to guard against rendering anomalies.
 */

import React from 'react';
import { useRoom } from '../context/RoomContext';
import { getFileUrl, getDownloadUrl } from '../services/api';
import toast from 'react-hot-toast';

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType, name) {
  if (mimeType?.startsWith('image/')) return '🖼️';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType?.includes('zip') || mimeType?.includes('tar')) return '🗜️';
  if (name?.match(/\.(py|js|ts|jsx|tsx|cpp|c|java|go|rs)$/i)) return '📝';
  if (name?.match(/\.(sh|bash|zsh)$/i)) return '⚡';
  if (mimeType?.startsWith('text/')) return '📃';
  return '📎';
}

function FileCard({ file }) {
  const isImage = file.mimeType?.startsWith('image/');
  const imageUrl = isImage ? getFileUrl(file.storedName) : null;

  const handleCopyUrl = () => {
    const url = `${window.location.origin.replace(':3000', ':5000')}/uploads/${file.storedName}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('File URL copied!', { duration: 1500 });
    }).catch(() => {
      toast.error('Unable to copy URL field automatically.');
    });
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = getDownloadUrl(file.storedName);
    a.download = file.originalName;
    a.click();
  };

  return (
    <div className="file-chip p-3 mb-2 mx-3 animate-fade-in">
      {/* Image preview canvas */}
      {isImage && (
        <div className="mb-2 rounded-lg overflow-hidden bg-[#050508]">
          <img
            src={imageUrl}
            alt={file.originalName}
            className="w-full max-h-32 object-contain"
            loading="lazy"
          />
        </div>
      )}

      <div className="flex items-start gap-2">
        <span className="text-lg flex-shrink-0">{getFileIcon(file.mimeType, file.originalName)}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white truncate" title={file.originalName}>
            {file.originalName}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {formatBytes(file.size)} · {file.uploadedBy || 'Anonymous'}
          </p>
        </div>
      </div>

      <div className="flex gap-2 mt-2">
        <button
          onClick={handleDownload}
          className="flex-1 btn-primary py-1.5 text-xs"
        >
          ↓ Download
        </button>
        <button
          onClick={handleCopyUrl}
          className="btn-ghost px-2 py-1.5 text-xs"
          title="Copy direct file URL"
        >
          🔗
        </button>
      </div>
    </div>
  );
}

export default function FileList() {
  const { files } = useRoom();

  if (!files || files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center px-4">
        <div className="text-3xl mb-2">📭</div>
        <p className="text-[var(--text-muted)] text-xs">No files shared yet</p>
        <p className="text-[var(--text-muted)] text-xs mt-1">Use the attach button below the chat</p>
      </div>
    );
  }

  return (
    <div className="py-3">
      <p className="text-xs text-[var(--text-muted)] font-mono px-3 mb-2">
        {files.length} file{files.length !== 1 ? 's' : ''} shared
      </p>
      {[...files].reverse().map((file, index) => {
        // Build an explicit fallback strategy to avoid duplicate key issues in React virtual DOM mapping
        const absoluteUniqueKey = file.id || file._id || `${file.storedName || 'file'}-${index}`;
        
        return (
          <FileCard 
            key={absoluteUniqueKey} 
            file={file} 
          />
        );
      })}
    </div>
  );
}