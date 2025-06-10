const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Update for production
    methods: ["GET", "POST"],
  },
});

// In-memory storage
const rooms = {}; // { roomId: { users: [] } }
const users = {}; // { socketId: username }
const MAX_USERS_IN_ROOM = 4;

// Utility functions
const generateRoomId = () => crypto.randomBytes(3).toString("hex"); // 6-character room ID
const getUsername = (id) => users[id] || "Unknown";

const leaveRoom = (socket, roomId) => {
  const room = rooms[roomId];
  try {
    room.users = room.users.filter((id) => id !== socket.id);
    socket.leave(roomId);
    console.log(`User ${getUsername(socket.id)} left room ${roomId}`);

    if (room.users.length === 0) {
      delete rooms[roomId];
      console.log(`Room ${roomId} deleted (empty).`);
    } else {
      io.to(roomId).emit("user-list", room.users.map(id => ({ id, username: getUsername(id) })));
    }
  } catch (error) {
    console.error("Error leaving room:", error);
    return socket.emit("error", "Failed to leave room.");
  }
  
};

// Handle socket connection
io.on("connection", (socket) => {
  console.log("New user connected:", socket.id);
  
  // Register username
  socket.on("register-username", (username) => {
    users[socket.id] = username;
    console.log(`Registered user: ${username} (${socket.id})`);
  });

  // Create a room
  socket.on("create-room", async () => {
    try {
      const roomId = generateRoomId();
      rooms[roomId] = {
        users: [socket.id]
      };

      socket.join(roomId);
      console.log(`Room created: ${roomId} by ${getUsername(socket.id)}`);

      socket.emit("room-id", roomId);
      io.to(roomId).emit("user-list", rooms[roomId].users.map(id => ({ id, username: getUsername(id) })));
    } catch (err) {
      console.error("Error creating room:", err);
      socket.emit("error", "Failed to create room.");
    }
  });

  // Join a room
  socket.on("join-room", async (roomId) => {
    try {
      const room = rooms[roomId];

      if (!room) {
        return socket.emit("error", "Room ID not found.");
      }

      if (room.users.length >= MAX_USERS_IN_ROOM) {
        return socket.emit("error", "Room is full.");
      }
      if (room.users.includes(socket.id)) {
        return socket.emit("error", "You are already in this room.");
      }

      socket.join(roomId);
      room.users.push(socket.id);
      io.to(roomId).emit("user-list", room.users.map(id => ({ id, username: getUsername(id) })));

      console.log(`User ${getUsername(socket.id)} joined room ${roomId}`);
      console.log(`Current room strength: ${room.users.length}`);

      
    } catch (err) {
      console.error("Join room error:", err);
      socket.emit("error", "Failed to join room.");
    }
  });

  // Handle disconnect
  socket.on("disconnect", async () => {
    console.log(`User disconnected: ${getUsername(socket.id)}`);
    leaveRoom(socket, Object.keys(rooms).find(roomId => rooms[roomId].users.includes(socket.id)));
    delete users[socket.id];
    
  });

  socket.on("LeaveRoom", (roomId) => {
    leaveRoom(socket, roomId);
    console.log(`User ${getUsername(socket.id)} leaved room ${roomId}`);
  });

  // Relay signaling data for connection establishment
  socket.on("signal", ({ to, signal }) => {
    console.log(`Relaying signal from ${socket.id} to ${to}`);
    io.to(to).emit("signal", { from: socket.id, signal });
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
