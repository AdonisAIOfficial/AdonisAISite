const dbManager = require("./backend/dbManager.js");
let db = dbManager.readDatabase();
const fetch = require('node-fetch');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require("uuid");
function generateLoginToken()
{
    const loginToken = uuidv4();
    bcrypt.hash(loginToken, 1, function(err, hash) {
        
    })
}
function enter(email, password)
{
    // try login first
    if(email in db)
    {
        const hashedPassword = db[email].password;
        bcrypt.compare(password, hashedPassword, function(err, result) {
            if (err) throw err;
            if (result) {
                // password is valid, generate login token
                const loginToken = generateLoginToken(email, password);
                // send login token to client
                return {op: "allowLogin", msg: loginToken};

            } else {
                // password is invalid, send message to client that the password is invalid
                return {op: "denyLogin", msg: "Incorrect password."};
            }
        });
    }
    else // if email doesn't exist in db, then signup
    {
        // check if temp mail

    }

}
async function authenticate(email, loginToken) {
    
}
async function isTempMail(email) {
    // Make GET request to the API endpoint
    const response = await fetch(`https://disposable.debounce.io/?email=${encodeURIComponent(email)}`);
  
    // Parse JSON response
    const data = await response.json();
  
    // Extract disposable status from response data
    const { disposable } = data;
  
    // Return true if disposable is "true", false otherwise
    return disposable === "true";
  }
module.exports = {};