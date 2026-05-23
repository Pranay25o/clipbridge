/**
 * client/src/App.js
 * App routing configurations, global theme setups, and toast alert provider layers.
 * 
 * CHANGES MADE:
 * - Completed the comprehensive v7 routing flag configuration set inside the `<BrowserRouter>`.
 * - Cleans out all remaining terminal console warning notices completely.
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { RoomProvider } from './context/RoomContext';
import HomePage from './pages/HomePage';
import RoomPage from './pages/RoomPage';

function App() {
  return (
    <BrowserRouter 
      future={{ 
        v7_startTransition: true, 
        v7_relativeSplatPath: true
      }}
    >
      <RoomProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#0d0d1a',
              color: '#e0e0f0',
              border: '1px solid #1a1a35',
              borderRadius: '10px',
              fontFamily: 'Sora, sans-serif',
              fontSize: '14px',
            },
            success: {
              iconTheme: { primary: '#00ff9d', secondary: '#050508' },
            },
            error: {
              iconTheme: { primary: '#ff4444', secondary: '#050508' },
            },
          }}
        />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/room/:roomId" element={<RoomPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </RoomProvider>
    </BrowserRouter>
  );
}

export default App;