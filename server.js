const WebSocket = require("ws");
const express = require("express");
const http = require("http");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const account_manager = require("./server/account-manager.js");
const db_manager = require("./server/db-manager.js");
const chat_manager = require("./server/chat-manager.js");
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.static(path.join(__dirname, "./client")));

wss.on("connection", async (ws) => {
  ws.id = uuidv4();
  ws.authenticated = false;
  ws.on("message", async (message) => {
    const json = JSON.parse(message);
    if (json.op == "authenticate") {
      // client must provide email and login token
      if (!json.email || !json.token) {
        // incorrect authentication
        ws.send(
          JSON.stringify({
            op: "auth_res",
            code: 400,
            message:
              "Authentication failed: email and auth token are required. Try relogin at https://adonis-ai.com/enter",
          }),
        );
        return;
      } else {
        const result = await account_manager.authenticate(
          json.email,
          json.token,
        );
        ws.authenticated = result.auth;
        if (!ws.authenticated && result.expired == true) {
          // If token is valid but expired
          ws.send(
            JSON.stringify({
              op: "auth_res",
              code: 401,
              message:
                "Auth token has expired. Relogin or signup at https://adonis-ai.com/enter",
            }),
          );
        } else if (!ws.authenticated) {
          // incorrect auth token or email
          ws.send(
            JSON.stringify({
              op: "auth_res",
              code: 403,
              message:
                "Authentication failed: email or auth token invalid. Try relogin or signup at https://adonis-ai.com/enter",
            }),
          );
        } else {
          ws.email = json.email;
          ws.send(
            JSON.stringify({
              op: "auth_res",
              code: 200,
              message: "Authentication successful.",
            }),
          );
        }
        return;
      }
    }
    if (ws.authenticated == true) {
      // Only if websocket connection is authenticated.
      switch (json.op) {
        case "send_message":
          const stream_id = uuidv4();
          ws.send(
            JSON.stringify({ op: "start_message", message_id: stream_id }),
          ); // Start message.
          let response = "";
          const listener = (chunk) => {
            // Set emitter listener.
            response += chunk.chunk != null ? chunk.chunk : ""; // Make sure we aren't appending undefined or null chunks.
            ws.send(
              JSON.stringify({
                op: "chunk",
                chunk: chunk.chunk,
                message_id: stream_id,
              }),
            ); // Send chunk.
            if (chunk.end == true) {
              const timestamp =
                new Date().toISOString().slice(0, 19) +
                "." +
                new Date()
                  .getMilliseconds()
                  .toString()
                  .padStart(3, "0")
                  .slice(0, 1);
              ws.send(
                JSON.stringify({
                  op: "end_message",
                  response: response,
                  timestamp: timestamp,
                }),
              ); // End message.
              db_manager.exec(
                "INSERT INTO messages (email, message, timestamp, from_user) VALUES ($1, $2, $3, $4)",
                [ws.email, response, timestamp, false],
              );
              chat_manager.emitter.removeListener(stream_id, listener); // Remove emitter listening.
            }
          };
          chat_manager.emitter.on(stream_id, listener);
          chat_manager.getResponse(stream_id, json.chat);

          db_manager.exec(
            "INSERT INTO messages (email, message, timestamp, from_user) VALUES ($1, $2, $3, $4)",
            [
              ws.email,
              json.chat.message[json.chat.message.length - 1], // Get the last message.
              json.chat.timestamp[json.chat.timestamp.length - 1], // Insert the exact timestamp when message was sent.
              true, // The message is from the user.
            ],
          );
          break;
        case "get_missing_data":
          ws.send(
            JSON.stringify({
              op: "add_missing_data",
              data: await chat_manager.getMissingData(
                ws.email,
                json.copy_updated_at,
              ),
            }),
          );
          break;
        case "feedback":
          db_manager.exec(
            "INSERT INTO feedback (feedback, email) VALUES ($1, $2)",
            [json.feedback, json.email],
          );
          break;
        case "delete_chat":
          chat_manager.deleteChat(ws.email);
          break;
        case "clear_memory":
          chat_manager.deleteMemory(ws.email);
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
app.get("/settings", (req, res) => {
  res.sendFile(path.join(__dirname, "client/settings", "settings.html"));
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
app.post("/-/changePassword", async (req, res) => {
  let response = await account_manager.changePassword(
    req.body.email,
    req.body.auth_token,
    req.body.new_password,
  );
  res.json({ response: response });
});
app.post("/-/clearChat", (req, res) => {});
app.post("/-/deleteAccount", (req, res) => {});
// Handle 404 for unrecognized routes
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "client/404", "404.html"));
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
