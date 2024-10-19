const WebSocket = require("ws");
const express = require("express");
const http = require("http");
const path = require("path");
const AI = require("./server-side/AI.js");
const { v4: uuidv4 } = require("uuid");
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const account_manager = require("./server-side/account-manager.js");
let userCount = 0;
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.static(path.join(__dirname, "./client-side")));
let userMap = new Map(); // WebSocket connection handler
let blackList = new Set(); // sends the user to pay
let grayList = new Set(); // sends the user to login
let whitelist = new Set(); // allows user to freely chat

wss.on("connection", async (ws) => {
  userCount++;
  ws.userSessionId = uuidv4();
  grayList.add(ws.userSessionId);
  ws.on("message", async (message) => {
    const json = JSON.parse(message);
    switch (json.op) {
      case "auth":
        break;
      case "denyLogin":
        ws.send(`{"op":"denyLogin","msg":"${result.msg}"}`);
        break;
      case "error":
        ws.send(`{"op":"error","msg":"${result.msg}"}`);
        break;
      case "msg":
        break;
      default:
        console.log("Unknown op: " + json.op);
        break;
    }
  });
  ws.on("close", () => {
    userCount--;

    // Remove the user from the map on disconnection
    userMap.delete(ws.userId);
  });
});
// Serve HTML files
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "client-side/chat", "chat.html"));
});

app.get("/landing", (req, res) => {
  res.sendFile(path.join(__dirname, "client-side/landing", "landing.html"));
});
app.get("/enter", (req, res) => {
  res.sendFile(path.join(__dirname, "client-side/enter", "enter.html"));
});
// Endpoints: GET, POST, etc.
app.post("/-/enter", (req, res) => {
  const emitterId = uuidv4();
  account_manager.emitter.on(emitterId, (data) => {
    switch (data.op) {
      case "verifyEmail":
        res.json({ op: data.op, verificationId: data.verificationId });
        break;
      case "loginApproved":
        res.json({ op: data.op, token: data.token });
        break;
      case "temporaryEmailForbidden":
        res.json({ op: data.op });
        break;
      case "error":
        res.json({ op: data.op });
        break;
    }
  });
  account_manager.enter(req.body.email, req.body.password, emitterId);
});
app.post("/-/verify", (req, res) => {
  if (!req.body.code) {
    // check if code is even provided
    res.json({ op: "incorrect-code" });
    return;
  }
  if (account_manager.codes[req.body.verificationId] == req.body.code) {
    // check if the verification code provided is correct
    // remove the code from 'codes' array to free up memory
    delete account_manager.codes[req.body.verificationId];
    // finalise signup:
    const loginToken = account_manager.createAccount(
      req.body.email,
      req.body.password,
    );
    res.json({ op: "verified", token: loginToken });
    // create pending account
    // generate login token
    // return login token with op "verified"
  } else {
    res.json({ op: "incorrect-code" });
  }
});

app.post("/-/deleteAccount", (req, res) => {});
// Handle 404 for unrecognized routes
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "client-side/404", "404.html"));
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
