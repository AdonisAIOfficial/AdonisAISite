const WebSocket = require("ws");
const express = require("express");
const http = require("http");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, "./public")));
let userCount = 0;
// WebSocket connection handler
wss.on("connection", (ws) => {
  console.clear();
  userCount++;
  console.log(`Active users: ${userCount}`);

  // Handle messages from clients
  ws.on("message", (message) => {
    console.log("Received:", JSON.parse(message));
    ws.send(message);
    // Broadcast the message to all clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  // Handle client disconnection
  ws.on("close", () => {
    console.clear();
    userCount--;
    console.log(`Active users: ${userCount}`);
  });
});

// Serve HTML files
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/chat", "chat.html"));
});

app.get("/landing", (req, res) => {
  res.sendFile(path.join(__dirname, "public/landing", "landing.html"));
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
