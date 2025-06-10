const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
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
const rooms = {}; // { roomId: { users: [ socketId, ...] } }
const users = {}; // { socketId: {username,roomId}}
const MAX_USERS_IN_ROOM = 4;

// Utility functions
const generateRoomId = () => crypto.randomBytes(3).toString("hex"); // 6-character room ID
const getUsername = (id) => users[id].username || "Unknown";

const leaveRoom = (socket, roomId) => {
  if (!roomId || !rooms[roomId]) return;
  const room = rooms[roomId];
  try {
    room.users = room.users.filter((id) => id !== socket.id);
    users[socket.id].roomId = null;
    socket.leave(roomId);
    console.log(`User ${getUsername(socket.id)} left room ${roomId}`);

    if (room.users.length === 0) {
      delete rooms[roomId];
      console.log(`Room ${roomId} deleted (empty).`);
    } else {
      // Notify remaining users in the room
      io.to(roomId).emit("user-left", socket.id);
    }
  } catch (error) {
    console.error("Error leaving room:", error);
    return socket.emit("error", "Failed to leave room.");
  }
  
};

// Handle socket connection
io.on("connection", (socket) => {
  console.log("New user connected:", socket.id);
  // Initialize user data

  // Register username
  socket.on("register-username", (username) => {
    users[socket.id] = { username: username, roomId: null };
    console.log(`Registered user: ${username} (${socket.id})`);
  });

  // Create a room
  socket.on("create-room", async () => {
    try {
      const roomId = generateRoomId();
      rooms[roomId] = {
        users: [socket.id]
      };
      users[socket.id].roomId = roomId;
      // Join the user to the room
      socket.join(roomId);
      console.log(`Room created: ${roomId} by ${getUsername(socket.id)}`);

      socket.emit("room-id", roomId);

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

      if (users[socket.id].roomId) {
        return socket.emit("error", "You are already in a room. Leave it first.");
      }

      room.users.push(socket.id);
      users[socket.id].roomId = roomId;
      
      socket.join(roomId);
      io.to(roomId).emit("user-joined", { id: socket.id, username: getUsername(socket.id) });
      io.to(socket.id).emit("room-joined", { roomId, users: room.users.map(id => ({ id, username: getUsername(id) })) });

      console.log(`User ${getUsername(socket.id)} joined room ${roomId}`);
      console.log(`Current room strength: ${room.users.length}`);

      
    } catch (err) {
      console.error("Join room error:", err);
      socket.emit("error", "Failed to join room.");
    }
  });

  // Handle disconnect
  socket.on("disconnect", async () => {
    const username = users[socket.id]?.username || socket.id;
    console.log(`User disconnected: ${username}`);
    leaveRoom(socket, users[socket.id]?.roomId);
    delete users[socket.id];
  });

  socket.on("leave-room", (roomId) => {
    leaveRoom(socket, roomId);
    console.log(`User ${getUsername(socket.id)} leaved room ${roomId}`);
  });

  //optional: user-list
  socket.on("user-list", (roomId) => {
    const userList = rooms[roomId]?.users?.map(id => ({ id: id, username: getUsername(id) }));
    io.to(socket.id).emit("user-list", userList);
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

//types of listen events
// 1. "connection" - When a new user connects (by default)
// 2. "register-username" (username) - Register a username for the socket
// 3. "create-room" - Create a new room
// 4. "join-room" (roomId) - Join an existing room
// 5. "disconnect" - When a user disconnects
// 6. "leave-room" (roomId) - Leave a room
// 7. "signal" ({ to, signal }) - Relay signaling data for peer connection
// 8. "user-list" (roomId) - Get the list of users in a room


//types of emits events
// 1. "room-id" (roomId)- Create a new room
// 2. "signal" ({ to, signal }) - Relay signaling data for peer connection
// 3. "user-joined" ({ id, username }) - Notify users in the room when a new user joins
// 4. "room-joined" ({ roomId, users[{id:,username:}] }) - Notify the user who joined about the room and its users
// 5. "user-left" (socketId) - Notify users in the room when a user leaves
// 6. "error" (message) - Send error messages to the user
// 7. "user-list" (userList) - Send the list of users in a room to the requesting user
