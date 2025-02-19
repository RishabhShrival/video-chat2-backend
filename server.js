const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'https://video-chat2-frontend.onrender.com',
    methods: ['GET', 'POST']
  }
});

let users = {}; // Store active users

io.on("connection", (socket) => {
  let username = null;

  socket.on("register", (userId) => {
    users[userId] = socket.id;
        io.emit("user-list", Object.keys(users));
  })

  socket.on("call-user", ({ to, offer }) => {
        if (users[to]) {
            io.to(users[to]).emit("incoming-call", { from: socket.id, offer });
        }
    });

    socket.on("answer-call", ({ to, answer }) => {
        if (users[to]) {
            io.to(users[to]).emit("call-answered", { from: socket.id, answer });
        }
    });

    socket.on("ice-candidate", ({ to, candidate }) => {
        if (users[to]) {
            io.to(users[to]).emit("ice-candidate", { from: socket.id, candidate });
        }
    });
  
    socket.on("disconnect", () => {
        Object.keys(users).forEach((key) => {
            if (users[key] === socket.id) delete users[key];
        });
        io.emit("user-list", Object.keys(users));
      
      });

    });



server.listen(8080, () => console.log("Server running on port 8080"));
