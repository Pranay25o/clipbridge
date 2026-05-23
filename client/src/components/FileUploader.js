import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { useRoom } from '../context/RoomContext';
import { uploadFiles } from '../services/api';

const MAX_SIZE_MB = 50;

export default function FileUploader() {
  const { room, userName, notifyFileUploaded } = useRoom();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const processFiles = useCallback(async (files) => {
    if (!room) return toast.error('Not in a room');
    if (files.length === 0) return;

    setUploading(true);
    setProgress(0);

    try {
      const result = await uploadFiles(room.id, files, userName, setProgress);

      if (result.success) {
        result.files.forEach(file => notifyFileUploaded(file));
        toast.success(`${result.files.length} file(s) uploaded!`);
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Upload failed';
      toast.error(msg);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [room, userName, notifyFileUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: processFiles,
    maxSize: MAX_SIZE_MB * 1024 * 1024,
    onDropRejected: (rejected) => {
      rejected.forEach(r => {
        if (r.errors[0]?.code === 'file-too-large') {
          toast.error(`File too large (max ${MAX_SIZE_MB}MB)`);
        } else {
          toast.error(`Rejected: ${r.file.name}`);
        }
      });
    },
  });

  return (
    <div className="border-t border-[var(--border)] bg-[#080810]">
      {/* Collapsed toggle */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-[var(--text-muted)] hover:text-white transition-colors"
      >
        <span className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Attach Files
        </span>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Drop zone */}
      {expanded && (
        <div className="px-3 pb-3">
          <div
            {...getRootProps()}
            className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDragActive
                ? 'border-[var(--brand)] bg-[#00ff9d08] drag-overlay'
                : 'border-[var(--border)] hover:border-[#00ff9d40] hover:bg-[#00ff9d05]'
            }`}
          >
            <input {...getInputProps()} />

            {uploading ? (
              <div>
                <div className="w-8 h-8 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-[var(--brand)]">Uploading… {progress}%</p>
                <div className="mt-2 h-1 bg-[var(--border)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--brand)] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : isDragActive ? (
              <p className="text-[var(--brand)] text-sm font-medium">Drop files here</p>
            ) : (
              <div>
                <div className="text-2xl mb-2">📁</div>
                <p className="text-[var(--text-muted)] text-xs">
                  Drag & drop or <span className="text-[var(--brand)]">browse</span>
                </p>
                <p className="text-[var(--text-muted)] text-xs mt-1">
                  Images, PDFs, ZIPs, code, text — up to {MAX_SIZE_MB}MB
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
