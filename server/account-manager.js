const db_manager = require("./db-manager.js");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const emailVerifier = require("./email-verifier.js");
const tools = require("./tools.js");
const crypto = require("crypto");

let codes = [];

function hash(to_hash, salt_rounds = 10) {
  // Note: Default salt rounds set to 10 so it's practically impossible for Rainbow Table Attacks.
  try {
    const hash = bcrypt.hashSync(to_hash, salt_rounds);
    return { token: loginToken, hash: hash };
  } catch (err) {
    throw new Error("Error generating hash: " + err.message);
  }
}
async function enter(email, password) {
  // Try login first
  if (email in db) {
    const HASHED_PASSWORD_FROM_DB = await db_manager.exec(
      "SELECT password FROM users WHERE email = $1",
      [email],
    );
    const HASHED_PASSWORD_GENERATED = hash(password);
    // Checks if the password provided during login matches the one provided during signup.
    // If they match, verify user and give him an access token.
    // If they don't, reject him.
    if (HASHED_PASSWORD_FROM_DB == HASHED_PASSWORD_GENERATED) {
    }
    return new Promise((resolve, reject) => {
      bcrypt.compare(password, HASHED_PASSWORD, function (err, result) {
        if (err) {
          console.error("Error during comparison:", err);
          return reject({ op: "error", error: err });
        }

        if (result) {
          // Password is valid, generate access token
          const token_and_hash = generateAccessToken(email, password);

          // Store hashed login token in db
          db[email].loginToken = token_and_hash.hash;
          db_manager.setValueAtPath(
            db,
            `${email}/loginToken`,
            token_and_hash.hash,
          );

          // Return login token to client
          return resolve({ op: "loginApproved", token: token_and_hash.token });
        } else {
          // Password is invalid, return login denied
          return resolve({ op: "loginDenied" });
        }
      });
    });
  } else {
    // If email doesn't exist in db, then begin signup process
    if (await isTempMail(email)) {
      return { op: "temporaryEmailForbidden" };
    }
    const code = await emailVerifier.sendCode(email);
    const verificationId = uuidv4();
    codes[verificationId] = code;

    return {
      op: "verifyEmail",
      verificationId: verificationId,
      code: code,
    };
  }
}
async function createAccount(email, password) {
  const ACCESS_TOKEN = generateAccessToken();
  let user_object = {
    chat: [],
    stats: {
      info: "",
      cost: 0,
      paying: false,
    },
    access_token: ACCESS_TOKEN,
    access_token_created_at: tools.dd_mm_yy(),
    password: hash(password), // Hashed and salted
  };
  db_manager.setValueAtPath(db, `users/${email}`, user_object);
  return ACCESS_TOKEN;
}
function generateAccessToken(length = 32, saltRounds = 3) {
  // Generate a random access token
  const token = crypto.randomBytes(length).toString("hex");

  // Hash the token using bcrypt
  // Note: Only 3 salt rounds used, as access tokens aren't as sensitive as passwords and thus don't need to be salted as much. Plus, access tokens need to be used every time the user visits the website - thus it would be very computationaly expensive to use 10 salt rounds on every client connection. It would be slow and excessive. And finally, access tokens are discarded every X months.
  const hashedToken = bcrypt.hashSync(token, saltRounds);

  return { token, hashedToken };
}
async function authenticate(email, access_token) {
  const HASHED_ACCESS_TOKEN = hash(access_token, 3);
  const result = await db_manager.exec(
    "SELECT * FROM users WHERE email = $1 AND access_token = $2",
    [email, access_token],
  );
  return result.length > 0; // If the result is 1, then the client will be authenticated.
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

module.exports = { enter, authenticate, codes, createAccount };
