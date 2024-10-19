const db_manager = require("./db-manager.js");
let db = db_manager.readDatabase();
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const EventEmitter = require("events");
const emitter = new EventEmitter();
const emailVerifier = require("./email-verifier.js");
const tools = require("./tools.js");

let codes = [];

async function generateLoginToken() {
  const loginToken = uuidv4();
  const saltRounds = 10; // Makes it practically impossible for Rainbow Table Attack

  try {
    const hash = await bcrypt.hash(loginToken, saltRounds);
    return { token: loginToken, hash: hash };
  } catch (err) {
    throw new Error("Error generating hash: " + err.message);
  }
}
async function enter(email, password, emitterId) {
  // try login first
  if (email in db) {
    const hashedPassword = db[email].password;
    bcrypt.compare(password, hashedPassword, function (err, result) {
      if (err) {
        console.error("Error during comparison:", err);
        emitter.emit({ op: "error", error: err });
        return;
      }

      if (result) {
        // Password is valid, generate login token
        const token_and_hash = generateLoginToken(email, password);

        // Store hashed login token in db
        db[email].loginToken = token_and_hash.hash;
        db_manager.setValueAtPath(
          db,
          `users/${email}/loginToken`,
          token_and_hash.hash,
        );

        // Send login token to client
        emitter.emit({ op: "loginApproved", token: token_and_hash.token });
        return;
      } else {
        // Password is invalid, send message to client
        emitter.emit({ op: "loginDenied" });
        return;
      }
    });
  } else {
    // if email doesn't exist in db, then begin signup process
    if (await isTempMail(email)) {
      emitter.emit(emitterId, { op: "temporaryEmailForbidden" });
      return;
    }
    const code = await emailVerifier.sendCode(email);
    const verificationId = uuidv4();
    code[verificationId] = code;
    emitter.emit(emitterId, {
      op: "verifyEmail",
      verificationId: verificationId,
      code: code,
    });
    return;
  }
}
async function createAccount(email, password) {
  const ACCESS_TOKEN = await generateAccessToken();
  let user_object = {
    chat: [],
    stats: {
      info: "",
      cost: 0,
      paying: false
    },
    access_token: ACCESS_TOKEN,
    access_token_created_at: tools.dd_mm_yy()
  };
  db_manager.setValueAtPath(db, `users/${email}`, user_object);
  // this is the final step of the signup
  // returns loginToken
}
async function authenticate(email, loginToken) {
  // authentication logic
}

async function isTempMail(email) {
  const fetch = (await import("node-fetch")).default; // Dynamic import for node-fetch

  // Make GET request to the API endpoint
  const response = await fetch(
    `https://disposable.debounce.io/?email=${encodeURIComponent(email)}`,
  );

  // Parse JSON response
  const data = await response.json();

  // Extract disposable status from response data
  const { disposable } = data;

  // Return true if disposable is "true", false otherwise
  return disposable === "true";
}

module.exports = { enter, authenticate, emitter, codes, createAccount };
