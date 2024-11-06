const db_manager = require("./db-manager.js");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const email_verifier = require("./email-verifier.js");
const tools = require("./tools.js");
const crypto = require("crypto");

let codes = [];

function hash(to_hash, salt_rounds = 10) {
  // Note: Default salt rounds set to 10 so it's practically impossible for Rainbow Table Attacks.
  try {
    return bcrypt.hashSync(to_hash, salt_rounds);
  } catch (err) {
    throw new Error("Error generating hash: " + err.message);
  }
}
async function enter(email, password) {
  const HASHED_PASSWORD_FROM_DB = await db_manager.exec(
    "SELECT password FROM users WHERE email = $1",
    [email],
  );

  if (HASHED_PASSWORD_FROM_DB.rowCount > 0) {
    const hashedPasswordFromDb = HASHED_PASSWORD_FROM_DB.rows[0].password;

    // Use bcrypt.compareSync to verify the password
    const passwordMatches = bcrypt.compareSync(password, hashedPasswordFromDb);

    if (passwordMatches) {
      const token_and_hash = generateAccessToken();
      const currentDate = new Date().toISOString().split("T")[0]; // In YYYY-MM-DD format, which is used in SQL.
      await db_manager.exec(
        "UPDATE users SET access_token = $1, access_token_created_on = $2 WHERE email = $3",
        [token_and_hash.hash, currentDate, email],
      );
      return { op: "loginApproved", token: token_and_hash.token };
    } else {
      return { op: "loginDenied" };
    }
  } else {
    // Handle the case where the email doesn't exist
    if (await isTempMail(email)) {
      return { op: "temporaryEmailForbidden" };
    }
    const code = await email_verifier.sendCode(email);
    const verification_id = uuidv4();
    codes[verification_id] = code;

    return {
      op: "verifyEmail",
      verificationId: verification_id,
      code: code,
    };
  }
}
async function createAccount(email, password) {
  const TOKEN_AND_HASH = generateAccessToken();
  const response = await db_manager.exec(
    `INSERT INTO users (
       email, access_token, password
     ) VALUES (
       $1, $2, $3
     )`,
    [
      email,
      TOKEN_AND_HASH.hash,
      hash(password), // Hashed password
    ],
  );
  return TOKEN_AND_HASH.token;
}
function generateAccessToken(length = 32, saltRounds = 3) {
  // Generate a random access token.
  const token = crypto.randomBytes(length).toString("hex");

  // Hash the token using bcrypt
  // Note: Only 3 salt rounds used, as access tokens aren't as sensitive as passwords and thus don't need to be salted as much. Plus, access tokens need to be used every time the user visits the website - thus it would be very computationaly expensive to use 10 salt rounds on every client connection. It would be slow and excessive. And finally, access tokens are discarded every X months.
  const hash = bcrypt.hashSync(token, saltRounds);
  return { token, hash };
}
const thirtyDaysInMillis = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
async function authenticate(email, access_token) {
  // Get the current date in UTC and format it as YYYY-MM-DD
  const currentDate = new Date().toISOString().split("T")[0]; // Get only the date part

  const result = await db_manager.exec(
    "SELECT access_token, access_token_created_on FROM users WHERE email = $1",
    [email],
  );

  if (result.rowCount === 0) {
    // Account doesn't exist
    return { auth: false, account_not_exist: true };
  }

  const { access_token: storedToken, access_token_created_on } = result.rows[0];

  // Ensure stored date is in YYYY-MM-DD format
  const tokenCreatedOn = new Date(access_token_created_on)
    .toISOString()
    .split("T")[0];

  // Check if the token has expired (older than 30 days)
  const currentDateMillis = new Date(currentDate).getTime();
  const tokenCreatedOnMillis = new Date(tokenCreatedOn).getTime();

  if (currentDateMillis - tokenCreatedOnMillis > thirtyDaysInMillis) {
    // Token is expired
    return { auth: false, expired: true };
  }

  // Check if the provided access_token matches the stored one
  const authenticated = bcrypt.compareSync(access_token, storedToken);
  return { auth: authenticated };
}

async function isTempMail(email) {
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
