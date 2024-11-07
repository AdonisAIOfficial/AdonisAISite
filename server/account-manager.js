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
  const response = await db_manager.exec(
    "SELECT password FROM users WHERE email = $1",
    [email],
  );

  if (response.rowCount > 0) {
    const HASHED_PASSWORD_FROM_DB = response.rows[0].password;

    // Use bcrypt.compareSync to verify the password
    const passwords_match = bcrypt.compareSync(
      password,
      HASHED_PASSWORD_FROM_DB,
    );

    if (passwords_match) {
      const token_and_hash = generateAuthToken();
      const currentDate = new Date().toISOString().split("T")[0]; // In YYYY-MM-DD format, which is used in SQL.
      await db_manager.exec(
        "UPDATE users SET auth_token = $1, auth_token_created_on = $2 WHERE email = $3",
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
  const TOKEN_AND_HASH = generateAuthToken();
  const response = await db_manager.exec(
    `INSERT INTO users (
       email, auth_token, password
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
function generateAuthToken(length = 32, saltRounds = 3) {
  // Generate a random token.
  const token = crypto.randomBytes(length).toString("hex");

  // Hash the token using bcrypt
  // Note: Only 3 salt rounds used, as auth tokens aren't as sensitive as passwords and thus don't need to be salted as much. Plus, auth tokens need to be used every time the user visits the website - thus it would be very computationaly expensive to use 10 salt rounds on every client connection. It would be slow and excessive. And finally, auth tokens are discarded every X months.
  const hash = bcrypt.hashSync(token, saltRounds);
  return { token, hash };
}
const thirtyDaysInMillis = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
async function authenticate(email, auth_token) {
  // Get the current date in UTC and format it as YYYY-MM-DD
  const currentDate = new Date().toISOString().split("T")[0]; // Get only the date part

  const result = await db_manager.exec(
    "SELECT auth_token, auth_token_created_on FROM users WHERE email = $1",
    [email],
  );

  if (result.rowCount === 0) {
    // Account doesn't exist
    return { auth: false, account_not_exist: true };
  }

  const { auth_token: storedToken, auth_token_created_on } = result.rows[0];

  // Ensure stored date is in YYYY-MM-DD format
  const tokenCreatedOn = new Date(auth_token_created_on)
    .toISOString()
    .split("T")[0];

  // Check if the token has expired (older than 30 days)
  const currentDateMillis = new Date(currentDate).getTime();
  const tokenCreatedOnMillis = new Date(tokenCreatedOn).getTime();

  if (currentDateMillis - tokenCreatedOnMillis > thirtyDaysInMillis) {
    // Token is expired
    return { auth: false, expired: true };
  }

  // Check if the provided auth_token matches the stored one
  const authenticated = bcrypt.compareSync(auth_token, storedToken);
  return { auth: authenticated };
}

async function changePassword(email, auth_token, new_password) {
  try {
    if (!email || !auth_token || !new_password) return { code: 400 };
    let response = await db_manager.exec(
      "SELECT auth_token FROM users WHERE email = $1",
      [email],
    );
    console.log(response);
    if (response.rowCount < 1) return { code: 403 };
    const AUTH_TOKEN_FROM_DB = response.rows[0].auth_token;
    console.log(AUTH_TOKEN_FROM_DB);
    const authenticated = bcrypt.compareSync(auth_token, AUTH_TOKEN_FROM_DB);
    if (authenticated) {
      response = await db_manager.exec(
        "UPDATE users SET password = $1 WHERE email = $2",
        [hash(new_password), email],
      );
      return { code: 200 };
    } else return { code: 401 };
  } catch (error) {
    console.error(error);
  }
}
async function deleteAccount(email, auth_token) {
  // PROCESS:
  // Cancel stripe subscription ( with immediate termination )
  // Delete all messages belonging to such user
  // Delete user from
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

module.exports = {
  enter,
  authenticate,
  codes,
  createAccount,
  changePassword,
  deleteAccount,
};
