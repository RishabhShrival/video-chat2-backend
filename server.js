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
      rooms[roomId] = [];
      console.log(`Room created: ${roomId}`);
    }
    rooms[roomId].push(socket.id);
    socket.join(roomId);
    io.to(roomId).emit("user-list", rooms[roomId]); // Send user list of the room
    socket.emit("room-id", roomId); // Send the newly created room ID to the user
  });

  // Handle joining a room
  socket.on("join-room", (roomId) => {
    if (rooms[roomId]) {
      rooms[roomId].push(socket.id);
      socket.join(roomId);
      io.to(roomId).emit("user-list", rooms[roomId]); // Send user list of the room
      console.log(`User joined room: ${roomId}`);
    } else {
      socket.emit("error", "Room does not exist!");
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    for (let roomId in rooms) {
      rooms[roomId] = rooms[roomId].filter((id) => id !== socket.id);
      io.to(roomId).emit("user-list", rooms[roomId]);

      // If no users are left in the room, delete the room
      if (rooms[roomId].length === 0) {
        delete rooms[roomId];
        console.log(`Room ${roomId} has been deleted due to inactivity.`);
      }
    }
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
