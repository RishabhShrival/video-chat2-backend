const WebSocket = require("ws");

const server = new WebSocket.Server({ port: 3001 });
const waitingUsers = new Set();
const activeConnections = new Map();

server.on("connection", (socket) => {
  console.log("New connection established");
  let username = null;

  socket.on("message", (message) => {
    const data = JSON.parse(message);
    
    switch (data.type) {
      case "go-live":
        username = data.username;
        if (waitingUsers.size > 0) {
          const availableUser = waitingUsers.values().next().value;
          waitingUsers.delete(availableUser);
          activeConnections.set(username, availableUser);
          activeConnections.set(availableUser, username);
          
          sendToUser(username, { type: "matched", peer: availableUser });
          sendToUser(availableUser, { type: "matched", peer: username });
        } else {
          waitingUsers.add(username);
          sendToUser(username, { type: "no-available-users" });
        }
        break;
      
      case "offer":
      case "answer":
      case "ice-candidate":
        if (activeConnections.has(username)) {
          sendToUser(activeConnections.get(username), data);
        }
        break;

      case "go-off":
        cleanupUser(username);
        break;
      
      case "logout":
        cleanupUser(username);
        break;
    }
  });

  socket.on("close", () => {
    cleanupUser(username);
    console.log("Connection closed");
  });
});

function sendToUser(username, data) {
  server.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

function cleanupUser(username) {
  waitingUsers.delete(username);
  if (activeConnections.has(username)) {
    const peer = activeConnections.get(username);
    activeConnections.delete(peer);
    activeConnections.delete(username);
    sendToUser(peer, { type: "peer-disconnected" });
  }
}
