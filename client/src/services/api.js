/**
 * services/api.js
 * Axios-based API helpers
 */

import axios from 'axios';

const BASE = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

const api = axios.create({ baseURL: BASE });

export async function checkRoom(roomId) {
  const { data } = await api.get(`/api/rooms/${roomId}`);
  return data;
}

export async function getRoomQR(roomId) {
  const { data } = await api.get(`/api/rooms/${roomId}/qr`);
  return data;
}

export async function uploadFiles(roomId, files, userName, onProgress) {
  const form = new FormData();
  files.forEach(f => form.append('files', f));
  form.append('userName', userName);

  const { data } = await api.post(`/api/files/upload/${roomId}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt) => {
      if (onProgress) {
        onProgress(Math.round((evt.loaded * 100) / evt.total));
      }
    },
  });
  return data;
}

export function getFileUrl(filename) {
  return `${BASE}/uploads/${filename}`;
}

export function getDownloadUrl(filename) {
  return `${BASE}/api/files/${filename}`;
}

export async function endRoom(roomId) {
  const { data } = await api.delete(`/api/rooms/${roomId}`);
  return data;
}

export default api;