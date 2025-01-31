const WebSocket = require("ws");
const server = new WebSocket.Server({ port: 8080 });

let liveUsers = new Map(); // Store active users

server.on("connection", (ws) => {
  let username = null;

  ws.on("message", (message) => {
    const data = JSON.parse(message);

    switch (data.type) {
      case "go-live":
        username = data.username;
        liveUsers.set(username, ws);
        matchUsers();
        break;

      case "offer":
      case "answer":
      case "ice-candidate":
        sendToUser(data.target, data);
        break;
    }
  });

  ws.on("close", () => {
    if (username) liveUsers.delete(username);
  });
});

function matchUsers() {
  const users = [...liveUsers.keys()];
  if (users.length >= 2) {
    const [user1, user2] = users.slice(0, 2);
    sendToUser(user1, { type: "connect-peer", username: user2 });
    sendToUser(user2, { type: "connect-peer", username: user1 });
  } else {
    sendToUser(users[0], { type: "no-user-available" });
  }
}

function sendToUser(username, data) {
  if (liveUsers.has(username)) {
    liveUsers.get(username).send(JSON.stringify(data));
  }
}

// console.log("WebSocket server running on ws://localhost:8080");
