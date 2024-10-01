const dbManager = require("./dbManager.js");
let db = dbManager.readDatabase();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require("uuid");

function generateLoginToken() {
    const loginToken = uuidv4();
    bcrypt.hash(loginToken, 1, function(err, hash) {
        if(err) throw err;
        return {token: loginToken, hash: hash};
    });
}

let pollObj = {};
function getPoll(pollId)
{
    return pollObj[pollId];
}
async function enter(email, password, pollId) {
    // try login first
    if (email in db) {
        const hashedPassword = db[email].password;
        bcrypt.compare(password, hashedPassword, function(err, result) {
            if (err) {
                console.error("Error during comparison:", err);
                return {op: "error", msg: "An error occurred during login."};
            }

            if (result) {
                // Password is valid, generate login token
                const token_and_hash = generateLoginToken(email, password);

                // Store hashed login token in db
                db[email].loginToken = token_and_hash.hash;
                dbManager.setValiueAtPath(db, `users/${email}/loginToken`, token_and_hash.hash);

                // Send login token to client
                return {op: "allowLogin", msg: token_and_hash.token};

            } else {
                // Password is invalid, send message to client
                return {op: "denyLogin", msg: "Incorrect password."};
            }
        });

    } else {
        // if email doesn't exist in db, then signup
        if (await isTempMail(email)) {
            return {op: "denySignup", msg: "Temporary emails are forbidden."};
        }
        await sendConfirmationEmail(email);
    }
}

async function authenticate(email, loginToken) {
    // authentication logic
}

async function isTempMail(email) {
    const fetch = (await import('node-fetch')).default;  // Dynamic import for node-fetch

    // Make GET request to the API endpoint
    const response = await fetch(`https://disposable.debounce.io/?email=${encodeURIComponent(email)}`);

    // Parse JSON response
    const data = await response.json();

    // Extract disposable status from response data
    const { disposable } = data;

    // Return true if disposable is "true", false otherwise
    return disposable === "true";
}

module.exports = {enter, authenticate, getPoll};
