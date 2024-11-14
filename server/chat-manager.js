const db_manager = require("./db-manager.js");
const EventEmitter = require("events");
const emitter = new EventEmitter();
async function getResponse(email, stream_id, chat) {
  // const system_message =
}
async function getChat(email, chat_copy_updated_at) {
  //
}
async function clearChat(email) {
  //
}
module.exports = { emitter, getResponse, getChat, clearChat };
