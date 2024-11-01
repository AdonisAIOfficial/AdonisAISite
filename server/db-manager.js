// const { Client } = require("pg");
// const {
//   POSTGRES_ROOTUSER_PASSWORD,
//   POSTGRES_HOST_URL,
//   POSTGRES_PORT,
// } = require("./secrets.js");
// // Create a new client instance
// const client = new Client({
//   user: "root",
//   host: POSTGRES_HOST_URL,
//   database: "users",
//   password: POSTGRES_ROOTUSER_PASSWORD,
//   port: POSTGRES_PORT,
// });

// // Connect to the database
// client
//   .connect()
//   .then(() => console.log("Connected to PostgreSQL"))
//   .catch((err) => console.error("Connection error", err.stack));

const { Pool } = require("pg");
const { POSTGRES_CONNECTION_STRING } = require("./secrets.js");
const pool = new Pool({
  connectionString: POSTGRES_CONNECTION_STRING,
});
let client;
async function connect() {
  client = await pool.connect();
  console.log("Connected to PostgreSQL Server.");
}
async function exec(query, params = []) {
  try {
    const result = await client.query(query, params); // Use params for parameterized queries
    return result; // Return the result of the query
  } catch (error) {
    console.error("Error executing query:", error);
    throw error; // Rethrow the error for handling elsewhere
  }
}
connect();

module.exports = { exec };
