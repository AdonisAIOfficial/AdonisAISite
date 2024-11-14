const db_manager = require("./db-manager.js");
const { v4: uuidv4 } = require("uuid");
const email_verifier = require("./email-verifier.js");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

let codes = [];

function hash_password(to_hash, salt_rounds = 10) {
  // Retaining bcrypt for password hashing due to its salt and work factor design for password security
  try {
    return bcrypt.hashSync(to_hash, salt_rounds);
  } catch (err) {
    throw new Error("Error generating password hash: " + err.message);
  }
}

function hash_auth_token(token) {
  // Use Blake2b from crypto for auth token hashing
  const hash = crypto.createHash("blake2b512");
  hash.update(token);
  return hash.digest("hex");
}

async function enter(email, password) {
  const response = await db_manager.exec(
    "SELECT password FROM users WHERE email = $1",
    [email],
  );

  if (response.rowCount > 0) {
    const HASHED_PASSWORD_FROM_DB = response.rows[0].password;

    // Use bcrypt.compareSync to verify the password
    const bcrypt = require("bcryptjs");
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
  await db_manager.exec(
    `INSERT INTO users (
       email, auth_token, password
     ) VALUES (
       $1, $2, $3
     )`,
    [
      email,
      TOKEN_AND_HASH.hash,
      hash_password(password), // Hashed password
    ],
  );
  return TOKEN_AND_HASH.token;
}

function generateAuthToken(length = 32) {
  // Generate a random token.
  const token = crypto.randomBytes(length).toString("hex");

  // Hash the token using Blake2b
  const hash = hash_auth_token(token);
  return { token, hash };
}

const thirtyDaysInMillis = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
async function authenticate(email, auth_token) {
  const currentDate = new Date().toISOString().split("T")[0];

  const result = await db_manager.exec(
    "SELECT auth_token, auth_token_created_on FROM users WHERE email = $1",
    [email],
  );

  if (result.rowCount === 0) {
    return { auth: false, account_not_exist: true };
  }

  const { auth_token: storedToken, auth_token_created_on } = result.rows[0];

  const tokenCreatedOn = new Date(auth_token_created_on)
    .toISOString()
    .split("T")[0];

  const currentDateMillis = new Date(currentDate).getTime();
  const tokenCreatedOnMillis = new Date(tokenCreatedOn).getTime();

  if (currentDateMillis - tokenCreatedOnMillis > thirtyDaysInMillis) {
    return { auth: false, expired: true };
  }

  const authenticated = hash_auth_token(auth_token) === storedToken;
  return { auth: authenticated };
}

async function changePassword(email, auth_token, new_password) {
  try {
    if (!email || !auth_token || !new_password) return { code: 400 };
    let response = await db_manager.exec(
      "SELECT auth_token FROM users WHERE email = $1",
      [email],
    );
    if (response.rowCount < 1) return { code: 403 };
    const AUTH_TOKEN_FROM_DB = response.rows[0].auth_token;

    const authenticated = hash_auth_token(auth_token) === AUTH_TOKEN_FROM_DB;
    if (authenticated) {
      await db_manager.exec("UPDATE users SET password = $1 WHERE email = $2", [
        hash_password(new_password),
        email,
      ]);
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
  const response = await fetch(
    `https://disposable.debounce.io/?email=${encodeURIComponent(email)}`,
  );

  const data = await response.json();

  const { disposable } = data;

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
