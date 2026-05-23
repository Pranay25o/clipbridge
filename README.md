# ClipBridge 🌉

**Real-time cross-device clipboard & file sharing**

Share text, code, commands, and files instantly between Windows, Ubuntu, Jetson Nano, Raspberry Pi, and any device with a browser — no accounts, no installs, just a room code.

---

## Features

- 🏠 **Temporary Rooms** — Create a room with a 7-char code (e.g. `XK9-P2M`)
- 💬 **Real-time Chat** — Text, code snippets, terminal commands synced instantly via WebSockets
- 📋 **Clipboard** — One-click copy any message, paste from clipboard
- 📁 **File Sharing** — Drag & drop upload, instant download on all connected devices
- 🖼️ **Image Preview** — Inline previews for uploaded images
- 📱 **QR Code Join** — Scan to join from any mobile device
- ⏱️ **Auto-expiry** — Rooms and files automatically deleted (30m / 1h / 24h / never)
- 👥 **Typing Indicators** — See who's typing in real-time
- 🎨 **Dark UI** — Terminal-inspired developer interface

---

## Project Structure

```
clipbridge/
├── server/                    # Node.js + Express + Socket.IO
│   ├── controllers/
│   │   ├── roomStore.js       # In-memory room/message/file store
│   │   └── cleanup.js         # Auto-expiry & file deletion
│   ├── middleware/
│   │   └── upload.js          # Multer configuration
│   ├── routes/
│   │   ├── rooms.js           # Room REST endpoints + QR
│   │   └── files.js           # File upload/download
│   ├── socket/
│   │   └── handlers.js        # All Socket.IO event handlers
│   ├── uploads/               # Uploaded files (auto-created)
│   ├── server.js              # Entry point
│   ├── package.json
│   └── .env.example
│
└── client/                    # React + Tailwind
    ├── src/
    │   ├── components/
    │   │   ├── MessageList.js     # Chat messages + syntax highlight
    │   │   ├── MessageInput.js    # Input with type selector (text/code/cmd)
    │   │   ├── FileUploader.js    # Drag & drop file upload
    │   │   ├── FileList.js        # Shared files sidebar
    │   │   ├── UserList.js        # Connected users sidebar
    │   │   ├── RoomTimer.js       # Countdown timer
    │   │   └── QRModal.js         # QR code modal
    │   ├── context/
    │   │   └── RoomContext.js     # Global room state + socket events
    │   ├── pages/
    │   │   ├── HomePage.js        # Create/join room landing
    │   │   └── RoomPage.js        # Main room UI
    │   ├── services/
    │   │   ├── socket.js          # Socket.IO client singleton
    │   │   └── api.js             # Axios API helpers
    │   ├── App.js
    │   ├── index.js
    │   └── index.css
    ├── package.json
    ├── tailwind.config.js
    └── .env.example
```

---

## Quick Start

### Prerequisites

- Node.js 18+ (or 16+)
- npm or yarn
- MongoDB (optional — app runs fully in-memory without it)

### 1. Clone / Download

```bash
git clone https://github.com/youruser/clipbridge.git
cd clipbridge
```

### 2. Setup Backend

```bash
cd server
cp .env.example .env
# Edit .env if needed (PORT, MONGODB_URI, CLIENT_URL, etc.)

npm install
npm run dev        # Development (nodemon)
# OR
npm start          # Production
```

Server starts at `http://localhost:5000`

### 3. Setup Frontend

```bash
cd client
cp .env.example .env
# REACT_APP_SERVER_URL=http://localhost:5000

npm install
npm start          # Starts on http://localhost:3000
```

> **Note:** The React app proxies API calls to the server automatically in dev.

---

## Environment Variables

### Server (`server/.env`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | Server port |
| `CLIENT_URL` | `http://localhost:3000` | Frontend URL (for CORS + QR links) |
| `MONGODB_URI` | *(none)* | MongoDB URI — optional |
| `MAX_FILE_SIZE` | `50` | Max upload size in MB |
| `DEFAULT_ROOM_EXPIRY` | `60` | Default room expiry in minutes |
| `CLEANUP_INTERVAL` | `5` | Cleanup cron interval in minutes |

### Client (`client/.env`)

| Variable | Default | Description |
|---|---|---|
| `REACT_APP_SERVER_URL` | `http://localhost:5000` | Backend URL |

---

## Socket Events

| Event | Direction | Payload |
|---|---|---|
| `create-room` | Client → Server | `{ userName, expiryMinutes }` |
| `join-room` | Client → Server | `{ roomId, userName }` |
| `send-message` | Client → Server | `{ roomId, content, type, userName }` |
| `receive-message` | Server → Client | Message object |
| `file-uploaded` | Client → Server | `{ roomId, fileInfo }` |
| `receive-file` | Server → Client | File object |
| `user-connected` | Server → Client | `{ user, users }` |
| `user-disconnected` | Server → Client | `{ socketId, users }` |
| `typing-start` | Client → Server | `{ roomId, userName }` |
| `typing-stop` | Client → Server | `{ roomId }` |
| `user-typing` | Server → Client | `{ userName, socketId }` |
| `room-history` | Server → Client | `{ messages, files }` |
| `room-joined` | Server → Client | `{ room, users }` |

---

## REST API

| Endpoint | Method | Description |
|---|---|---|
| `/api/rooms/:id` | GET | Check if room exists |
| `/api/rooms/:id/qr` | GET | Generate QR code for room |
| `/api/files/upload/:roomId` | POST | Upload files (multipart) |
| `/api/files/:filename` | GET | Download a file |
| `/api/health` | GET | Server health check |

---

## Auto-Expiry System

- **Cron job** runs every `CLEANUP_INTERVAL` minutes
- Expired rooms → removed from memory + all file records deleted
- Physical files older than 25h → deleted from `uploads/` folder
- Orphaned files (no room reference) → deleted after 5-minute grace period
- Inactive rooms (no expiry set, but inactive > 2h) → auto-removed

---

## Deployment

### Backend → Render

1. Push `server/` to a GitHub repo
2. Create new **Web Service** on [render.com](https://render.com)
3. Build command: `npm install`
4. Start command: `node server.js`
5. Add environment variables in Render dashboard
6. Set `CLIENT_URL` to your Vercel frontend URL

### Frontend → Vercel

1. Push `client/` to a GitHub repo (or monorepo root)
2. Import on [vercel.com](https://vercel.com)
3. Framework: **Create React App**
4. Add env var: `REACT_APP_SERVER_URL=https://your-render-url.onrender.com`
5. Deploy

### Backend → Railway

```bash
# From server/ directory
railway login
railway new
railway up
railway variables set PORT=5000 CLIENT_URL=https://yourapp.vercel.app
```

---

## Usage — Multi-Device Sharing

### Example: Share a file from Ubuntu to Raspberry Pi

1. **Ubuntu**: Open `http://your-server:3000`, create room, get code `XK9-P2M`
2. **Raspberry Pi**: Open same URL, enter code `XK9-P2M`, join
3. **Ubuntu**: Drag a file into the upload area
4. **Raspberry Pi**: File appears instantly — click Download

### Example: Share clipboard from Windows to Jetson Nano

1. Both open the same room
2. **Windows**: Paste text into chat (or use the Paste button)
3. **Jetson Nano**: Click the copy button on the message → clipboard updated

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Tailwind CSS, Socket.IO Client, React Router 6 |
| Backend | Node.js, Express 4, Socket.IO 4 |
| File uploads | Multer |
| QR codes | qrcode |
| Syntax highlight | react-syntax-highlighter |
| File drop | react-dropzone |
| Toasts | react-hot-toast |
| DB (optional) | MongoDB + Mongoose |
| Cron | node-cron |

---

## License

MIT
