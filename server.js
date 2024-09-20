const WebSocket = require("ws");
const express = require("express");
const http = require("http");
const path = require("path");
const ai = require("./backend/AI");
const { v4: uuidv4 } = require("uuid");
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, "./public")));
let userCount = 0;
let userMap = new Map();
// WebSocket connection handler
wss.on("connection", (ws) => {
  console.clear();
  userCount++;
  console.log(`Active users: ${userCount}`);

  // Assign a unique userId to the connection
  ws.userId = uuidv4();

  // Create a counter object for the user and store it in the map
  userMap.set(ws.userId, { int: 0 });

  // Handle messages from clients
  ws.on("message", (message) => {
    const json = JSON.parse(message);

    // Retrieve the user's counter from the map using userId
    const userCounter = userMap.get(ws.userId);

    // Increment the counter and send the response
    if (userCounter) {
      let int = userCounter.int++;
      ws.send(`{"op":"ch","ch":"${int}"}`);
      ws.send(`{"op":"end"}`);
    }
  });

  // Handle client disconnection
  ws.on("close", () => {
    console.clear();
    userCount--;
    console.log(`Active users: ${userCount}`);

    // Remove the user from the map on disconnection
    userMap.delete(ws.userId);
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
