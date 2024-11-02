const WebSocket = require("ws");
const express = require("express");
const http = require("http");
const path = require("path");
const adonis = require("./server/adonis.js");
const { v4: uuidv4 } = require("uuid");
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const account_manager = require("./server/account-manager.js");
let userCount = 0;
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.static(path.join(__dirname, "./client")));

wss.on("connection", async (ws) => {
  ws.id = uuidv4();
  ws.authenticated = false;
  ws.on("message", async (message) => {
    const json = JSON.parse(message);
    switch (json.op) {
      case "auth":
        console.log("auth 23:", json);
        // client must provide email and login token
        if (!json.email || !json.token) {
          console.log("!!!!! ERROR HERE !!!!!");
          // incorrect authentication
          ws.send(
            JSON.stringify({
              op: "auth_res",
              code: 400,
              message:
                "Authentication failed: email and access token are required. Try relogin at https://adonis-ai.com/enter",
            }),
          );
          break;
        } else {
          ws.authenticated = await account_manager.authenticate(
            json.email,
            json.token,
          );
          if (!ws.authenticated) {
            // incorrect access token or email
            ws.send(
              JSON.stringify({
                op: "auth_res",
                code: 403,
                message:
                  "Authentication failed: email or access token invalid. Try relogin or signup at https://adonis-ai.com/enter",
              }),
            );
          } else {
            ws.send(
              JSON.stringify({
                op: "auth_res",
                code: 200,
                message: "Authentication successful.",
              }),
            );
          }
          break;
        }
    }
  });
  ws.on("close", () => {});
});
// Serve HTML files
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "client/chat", "chat.html"));
});

app.get("/landing", (req, res) => {
  res.sendFile(path.join(__dirname, "client/landing", "landing.html"));
});
app.get("/enter", (req, res) => {
  res.sendFile(path.join(__dirname, "client/enter", "enter.html"));
});
// Endpoints: GET, POST, etc.
app.post("/-/enter", async (req, res) => {
  const response = await account_manager.enter(
    req.body.email,
    req.body.password,
  );
  switch (response.op) {
    case "verifyEmail":
      res.json({ op: response.op, verificationId: response.verificationId });
      break;
    case "loginApproved":
      console.log("88:", response);
      res.json({ op: response.op, token: response.token });
      break;
    case "temporaryEmailForbidden":
      res.json({ op: response.op });
      break;
    case "loginDenied":
      res.json({ op: response.op });
      break;
    case "error":
      res.json({ op: response.op });
      break;
    default:
      res.json({ op: response.op });
  }
});
app.post("/-/verify", async (req, res) => {
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
    const loginToken = await account_manager.createAccount(
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
  res.status(404).sendFile(path.join(__dirname, "client/404", "404.html"));
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
