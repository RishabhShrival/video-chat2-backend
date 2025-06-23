# 🧱 Peer-to-Peer Video Chat App — Backend

This is the **backend** for a secure, privacy-friendly, peer-to-peer video calling app. It uses **Node.js** with **Express** and **Socket.IO** to enable signaling between peers for WebRTC-based video/audio communication.

🔗 **Frontend Repo**: [video-chat-frontend](https://github.com/RishabhShrival/video-chat2-frontend) *(update with actual URL)*

---

## 🔧 Purpose

This backend serves as the **signaling server** required to establish WebRTC peer-to-peer connections. It does not handle or transmit media streams. Its sole role is to coordinate:

- Room creation & management
- Peer discovery & signaling
- Username mapping for socket IDs

---

## ✨ Features

- Socket.IO-based signaling server
- Room-based architecture (max 4 users per room)
- Username registration per socket
- Events to toggle mic/camera state
- Clean user exit and peer updates

---

## 🚀 Deployment

Hosted on [Render.io](https://video-chat2-4v77.onrender.com), works seamlessly with the frontend.

---

## 📦 Setup Instructions

### 1. Clone the repo

```bash
git clone https://github.com/your-username/video-chat-backend
cd video-chat-backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the server

```bash
node server.js
```

Make sure your `.env` in the **frontend** points to the correct backend URL:

```env
NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.onrender.com
```

---

## 🌍 API / Socket Events

### Emit Events (from Frontend)

| Event               | Payload                       | Description                         |
| ------------------- | ----------------------------- | ----------------------------------- |
| `register-username` | `{ username }`                | Associates a username with a socket |
| `create-room`       | -                             | Creates a new room and returns ID   |
| `join-room`         | `{ roomId }`                  | Joins existing room                 |
| `leave-room`        | `{ roomId }`                  | Leaves a room                       |
| `signal`            | `{ to, signal }`              | For WebRTC negotiation              |
| `camera-mic-status` | `{ id, roomId, camera, mic }` | Status broadcast                    |
| `user-list`         | `{ roomId }`                  | Requests list of users in room      |

### Listen Events (to Frontend)

| Event               | Payload               | Description                  |
| ------------------- | --------------------- | ---------------------------- |
| `room-id`           | `roomId`              | Sent after room creation     |
| `room-joined`       | `{ roomId, users }`   | Info after joining room      |
| `user-joined`       | `{ id, username }`    | New user joined notification |
| `user-left`         | `id`                  | A user left the room         |
| `signal`            | `{ from, signal }`    | Signaling data from peer     |
| `error`             | `message`             | Error messages               |
| `camera-mic-status` | `{ id, camera, mic }` | Status from another user     |
| `user-list`         | `[{ id, username }]`  | List of all users in room    |

---

## 💎 Security Considerations

- No personal data stored
- No media streams handled by backend
- Temporary in-memory storage for sockets and room state

---

## 🏃 Room Limitations

- Each room supports **maximum 4 users**.
- All media connections are handled **peer-to-peer** using WebRTC.

---

## 🦁 Author

Built by [Rishabh Shrival](https://github.com/RishabhShrival)

---

## 🔗 Related Projects

- **Frontend**: [video-chat-frontend](https://github.com/RishabhShrival/video-chat2-frontend)

