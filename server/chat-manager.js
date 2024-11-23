const { DEEPINFRA_API_KEY, LLM_MODEL } = require("./secrets.js");
const OpenAI = require("openai");
const openai = new OpenAI({
  baseURL: "https://api.deepinfra.com/v1/openai",
  apiKey: DEEPINFRA_API_KEY,
});
const db_manager = require("./db-manager.js");
const EventEmitter = require("events");
const emitter = new EventEmitter();
async function getResponse(email, stream_id, chat, message) {
  // For testing purposes:
  const completion = await openai.chat.completions.create({
    messages: [{ role: "user", content: message }],
    model: LLM_MODEL,
    stream: true,
  });

  for await (const chunk of completion) {
    if (chunk.choices[0].finish_reason) {
      emitter.emit(stream_id, { end: true });
    } else {
      emitter.emit(stream_id, { chunk: chunk.choices[0].delta.content });
    }
  }
}
async function getChat(email, chat_copy_updated_at) {
  //
}
async function clearChat(email) {
  //
}
module.exports = { emitter, getResponse, getChat, clearChat };
