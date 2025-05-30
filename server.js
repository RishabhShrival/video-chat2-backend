const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const crypto = require("crypto"); // For generating unique room IDs

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins (change in production)
    methods: ["GET", "POST"],
  },
});

const rooms = {}; // Store meeting rooms and their participants

// Utility function to generate a unique room ID
const generateRoomId = () => {
  return crypto.randomBytes(6).toString("hex"); // Generates a 12-character hexadecimal string
};

io.on("connection", (socket) => {
  console.log("New user connected:", socket.id);

  // Handle creating a room
  socket.on("create-room", () => {
    const roomId = generateRoomId();
    if (!rooms[roomId]) {
      rooms[roomId] = new Set();
      console.log(`Room created: ${roomId}`);
    }
    rooms[roomId].add(socket.id);
    socket.join(roomId);
    io.to(roomId).emit("user-list", rooms[roomId]); // Send user list of the room
    socket.emit("room-id", roomId); // Send the newly created room ID to the user
  });

  socket.on("join-room", (roomId) => {
  const room = rooms[roomId];
  if (room) {
    room.add(socket.id);
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
    const userList = Array.from(room);
    io.to(socket.id).emit("all-users", userList.filter(id => id !== socket.id)); // 👈 only send to joining user
    io.to(roomId).emit("user-list", userList);
  } else {
    socket.emit("error", "Room ID not found.");
  }
});

  // Handle disconnect
  socket.on("disconnect", () => {
  console.log("User disconnected:", socket.id);

  // Remove user from room
  for (const [roomId, room] of Object.entries(rooms)) {
    if (room.has(socket.id)) {
      room.delete(socket.id);

      // If room is empty, delete it
      if (room.size === 0) {
        delete rooms[roomId];
      } else {
        // Notify others in the room that this user left
        socket.to(roomId).emit("user-left", socket.id);
      }

      break;
    }
  }

  delete users[socket.id];
});


  // Relay signaling data
  socket.on("signal", ({ to, signal }) => {
    console.log(`Relaying signal from ${socket.id} to ${to}`);
    io.to(to).emit("signal", { from: socket.id, signal });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
