const WebSocket = require("ws");
const express = require("express");
const http = require("http");
const path = require("path");
const AI = require("./backend/AI");
const { v4: uuidv4 } = require("uuid");
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const accountManager = require("./backend/accountManager.js");
let userCount = 0;
const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, "./public")));
let userMap = new Map();
// WebSocket connection handler
let blackList = new Set(); // sends the user to pay 
let grayList = new Set(); // sends the user to login
let whitelist = new Set(); // allows user to freely chat
wss.on("connection", (ws) => {
  userCount++;
  ws.userSessionId = uuidv4();
  greyList.add(ws.userSessionId);
  ws.on("message", (message) => {
    const json = JSON.parse(message);
    switch (json.op) {
      case "login": 
        
      break;
      case "signup": 

      break;
    }
    // if(json.op=="auth")
    //   {
    //    if(json.token==null)
    //     {

    //     } 
    //   }
    /*
    ws.userId = uuidv4();
  
  let userAI = new AI();
  console.log(userAI);
  userMap.set(ws.userId, userAI);
   */
    // Retrieve the user's counter from the map using userId
    // let userAI = userMap.get(ws.userId);
    // userAI.respond()
    // ws.send(`{"op":"ch","ch":"${int}"}`);
    // ws.send(`{"op":"end"}`);
  });

  // Handle client disconnection
  ws.on("close", () => {
    userCount--;

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
app.get("/enter", (req, res) => {
  res.sendFile(path.join(__dirname, "public/enter", "enter.html"));
});
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

/**
 * The user object:
 * email: {
 *  chat: [],
 *  stats: {
 *    info: "",
 *    cost: 0,
 *    paying: false
 *  }
 * accessToken: "",
 * accessTokenCreatedAt: "",
 * password: "",
 * }
 */