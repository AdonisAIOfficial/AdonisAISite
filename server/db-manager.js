const { Pool } = require("pg");
const { SUPABASE_CONNECTION_STRING } = require("./secrets.js");
const pool = new Pool({
  connectionString: SUPABASE_CONNECTION_STRING,
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
