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

const MAX_USERS_IN_ROOM = 4; // Maximum users per room

io.on("connection", (socket) => {
  console.log("New user connected:", socket.id);

  // Handle creating a room
  socket.on("create-room", () => {
    const roomId = generateRoomId();
    if (!rooms[roomId]) {
      rooms[roomId] = new Set();
      console.log(`Room created: ${roomId}`);
    } else {
      console.log(`Room already exists: ${roomId}, generating a new one.`);
      return socket.emit("error", "Room ID already exists, please try again.");
    }

    rooms[roomId].add(socket.id);
    socket.join(roomId);
    io.to(roomId).emit("user-list", rooms[roomId]); // Send user list of the room
    socket.emit("room-id", roomId); // Send the newly created room ID to the user
  });

  // Handle joining a room
  socket.on("join-room", (roomId) => {
    const room = rooms[roomId];

    if (room) {
      // Check if the room has less than 4 users
      if (room.size < MAX_USERS_IN_ROOM) {
        room.add(socket.id);
        socket.join(roomId);
        console.log(`User ${socket.id} joined room ${roomId}`);

        const userList = Array.from(room);
        io.to(socket.id).emit("all-users", userList.filter((id) => id !== socket.id)); // Send to joining user
        io.to(roomId).emit("user-list", userList); // Notify all users in the room
      } else {
        socket.emit("error", "Room is full. Please try another room.");
      }
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
