const {
  DEEPINFRA_API_KEY,
  LLM_MODEL,
  SYSTEM_PROMPT_CORE_INSTRUCTIONS,
  SLIDING_WINDOW_MESSAGES_AMOUNT,
} = require("./secrets.js");
const OpenAI = require("openai");
const openai = new OpenAI({
  baseURL: "https://api.deepinfra.com/v1/openai",
  apiKey: DEEPINFRA_API_KEY,
});
const db_manager = require("./db-manager.js");
const EventEmitter = require("events");
const emitter = new EventEmitter();
async function getResponse(stream_id, full_chat) {
  /**
   * Steps:
   * Get semantic find prompt ( using fast LLM that analyzes recent messages )
   * Find x amount of texts by searching for title and then picking most relevant text chunks
   * Get relevant memories
   * Construct completion chat
   * Get completion
   * Stream response
   */
  let system_prompt = `${SYSTEM_PROMPT_CORE_INSTRUCTIONS}`;
  let active_chat = [
    { role: "system", content: system_prompt },
    ...sliceChat(full_chat, SLIDING_WINDOW_MESSAGES_AMOUNT),
  ];
  const completion = await openai.chat.completions.create({
    messages: active_chat,
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
async function getMissingData(email, copy_updated_at) {
  console.log(email, copy_updated_at);
  if (copy_updated_at == null) {
    copy_updated_at = "2000-01-01T00:00:00.0"; // Will essentially retrieve all data ( since no data has been inserted from earlier than the 2000)
  }
  const messages = await db_manager.exec(
    "SELECT * FROM messages WHERE email = $1 AND timestamp > $2 ORDER BY timestamp ASC",
    [email, copy_updated_at],
  );
  const memories = await db_manager.exec(
    "SELECT * FROM memories WHERE email = $1 AND timestamp > $2 ORDER BY timestamp ASC",
    [email, copy_updated_at],
  );
  return { messages: messages.rows, memories: memories.rows };
}
async function deleteChat(email) {
  db_manager.exec("DELETE FROM messages WHERE email = $1", [email]);
}
function sliceChat(chat, N) {
  // Combine the properties into an array of objects for easier manipulation
  const messages = chat.message.map((message, index) => ({
    content: message,
    timestamp: chat.timestamp[index],
    role: chat.from_user[index] ? "user" : "assistant", // Map boolean to "user" or "assistant"
  }));

  // Sort the messages by timestamp
  messages.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  // Slice the last N messages or return all if N is greater than the length
  const result = N >= messages.length ? messages : messages.slice(-N);

  // Return the result without the timestamp
  return result.map(({ timestamp, ...rest }) => rest);
}
function deleteMemory(email) {
  db_manager.exec("DELETE FROM memories WHERE email = $1", [email]);
}

module.exports = {
  emitter,
  getResponse,
  getMissingData,
  deleteChat,
  deleteMemory,
};
