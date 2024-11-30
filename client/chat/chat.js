const protocol = window.location.protocol === "https:" ? "wss://" : "ws://";
const ws = new WebSocket(`${protocol}${window.location.hostname}:3000`);
const textarea = document.querySelector(".auto-expanding-textarea");
const sendButton = document.querySelector(".send-button");
const messages = document.querySelector(".messages");
const toggleButton = document.querySelector(".mode-toggle-button");
const settingsButton = document.querySelector(".settings-button");
const feedbackBox = document.querySelector(".feedback-container");
const sendSection = document.querySelector(".send-section");
const feedbackButton = document.querySelector(".feedback-button");
let sendForcedDisabled = false;
const feedbackTextarea = document.querySelector(".feedback-textarea");
const submitFeedbackButton = document.querySelector(".submit-feedback-button");
const threedotsButton = document.querySelector(".three-dots-button");
let mobileMenuOpen = false;
let feedbackBoxOpen = false;
let chat = {
  message: [],
  timestamp: [],
  from_user: [],
};
ws.onopen = function () {
  // If user doesn't have email or auth token, don't even bother wasting the servers resources checking. Just send to /enter page.
  if (!localStorage.getItem("email") || !localStorage.getItem("auth_token"))
    window.location.replace(window.location.origin + "/enter");
  // Authenticate upon connection open.
  ws.send(
    JSON.stringify({
      op: "authenticate",
      email: localStorage.getItem("email"),
      token: localStorage.getItem("auth_token"),
    }),
  );
};
ws.onmessage = async (event) => {
  const message = event.data;
  // console.log("Message from server: ", message);
  const json = JSON.parse(message);
  switch (json.op) {
    case "auth_res":
      if (json.code == 200) {
        console.log("Authenticated successfully.");
        // Next step, retrieve missing messages.
        ws.send(
          JSON.stringify({
            op: "get_missing_data",
            copy_updated_at: localStorage.getItem("copy_updated_at"), // gets the last time the local copy was synced
          }),
        );
      } else if (json.code == 401) {
        // Auth token expired.
        console.log(
          `Auth token has expired. Redirecting to ${window.location.origin}/enter`,
        );
        localStorage.setItem("auth_token_expired", true);
        window.location.href = `${window.location.origin}/enter`;
      } else {
        console.log(
          `Problem with authentication. Redirecting to ${window.location.origin}/enter`,
        );
        window.location.href = `${window.location.origin}/enter`;
      }
      break;
    case "start_message":
      let adonis_message = document.createElement("div");
      adonis_message.className = "message assistant";
      adonis_message.id = json.message_id;
      messages.appendChild(adonis_message);
      messages.scrollTop = messages.scrollHeight;
      break;
    case "chunk":
      if (json.chunk != null)
        document.getElementById(json.message_id).textContent += json.chunk;
      break;
    case "end_message":
      sendForcedDisabled = false;
      updateSendButtonState();
      chat.message.push(json.response);
      chat.from_user.push(false);
      chat.timestamp.push(json.timestamp);
      localStorage.setItem("chat", JSON.stringify(chat));
      // Add assistant message to local copy of chat
      break;
    case "add_missing_data": {
      console.log("||Adding missing data||");
      console.log(json);
      loadChat();
    }
  }
};
threedotsButton.addEventListener("click", function () {
  if (mobileMenuOpen) {
    settingsButton.style.display = "none";
    toggleButton.style.display = "none";
    feedbackButton.style.display = "none";
    mobileMenuOpen = false;
  } else {
    settingsButton.style.display = "flex";
    toggleButton.style.display = "flex";
    feedbackButton.style.display = "flex";
    mobileMenuOpen = true;
  }
});

submitFeedbackButton.addEventListener("click", function () {
  ws.send(
    JSON.stringify({
      op: "feedback",
      email: localStorage.getItem("email"),
      feedback: feedbackTextarea.value,
    }),
  );
  feedbackTextarea.value = "";
  submitFeedbackButton.innerHTML = "Thank you!";
  submitFeedbackButton.disabled = true;
  setTimeout(function () {
    submitFeedbackButton.innerHTML = "Submit";
    feedbackBox.style.display = "none";
    messages.style.display = "inline-block";
    sendSection.style.display = "flex";
    feedbackBoxOpen = false;
  }, 2000);
});

feedbackTextarea.addEventListener("input", function () {
  submitFeedbackButton.disabled = this.value.trim() === "";
});

feedbackButton.addEventListener("click", function () {
  if (!feedbackBoxOpen) {
    feedbackBox.style.display = "block";
    messages.style.display = "none";
    sendSection.style.display = "none";
    feedbackBoxOpen = true;
  } else {
    feedbackBox.style.display = "none";
    messages.style.display = "inline-block";
    sendSection.style.display = "flex";
    feedbackBoxOpen = false;
  }
});

const maxRows = 6;
const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight);
settingsButton.addEventListener("click", function () {
  localStorage.setItem("toggledMode", mode);
  window.location.href = window.location.origin + "/settings";
});

textarea.addEventListener("input", function () {
  this.style.height = "auto";
  let newHeight = this.scrollHeight;
  const maxHeight = lineHeight * maxRows;
  if (newHeight > maxHeight) {
    newHeight = maxHeight;
    this.style.overflowY = "scroll";
  } else {
    this.style.overflowY = "hidden";
  }
  this.style.height = `${newHeight}px`;
});

textarea.addEventListener("keydown", function (event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    if (!sendForcedDisabled) sendMessage();
  }
});

sendButton.disabled = true;
textarea.addEventListener("input", function () {
  sendButton.disabled = this.value.trim() === "";
  if (sendForcedDisabled) {
    sendButton.disabled = true;
  }
});

sendButton.addEventListener("click", sendMessage);

const icons = ["fas fa-sun", "fas fa-moon", "fas fa-eye"];
const modes = ["light-mode", "dark-mode", "dark-red-mode"];
let mode = parseInt(localStorage.getItem("toggledMode"));
if (isNaN(mode)) {
  mode = 0;
}
document.body.classList.add(modes[mode]);
toggleButton.querySelector("i").className = icons[mode];
toggleButton.addEventListener("click", function () {
  document.body.classList.remove(modes[mode]);
  mode = (mode + 1) % modes.length;
  document.body.classList.add(modes[mode]);
  toggleButton.querySelector("i").className = icons[mode];
  localStorage.setItem("toggledMode", mode);
});

function sendMessage() {
  const message_text = textarea.value.trim();
  if (message_text !== "") {
    addMessage("user", message_text);
    textarea.value = "";
    sendButton.disabled = true;
    sendForcedDisabled = true;
    updateSendButtonState();
    adjustLayout();
    const timestamp =
      new Date().toISOString().slice(0, 19) +
      "." +
      new Date().getMilliseconds().toString().padStart(3, "0").slice(0, 1);
    chat.message.push(message_text);
    chat.from_user.push(true);
    chat.timestamp.push(timestamp);
    ws.send(
      JSON.stringify({
        op: "send_message",
        timestamp: timestamp,
        chat: chat,
      }),
    );

    localStorage.setItem("chat", JSON.stringify(chat));
  }
}

function addMessage(sender, text) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${sender}`;
  messageDiv.innerHTML = text;
  messages.appendChild(messageDiv);
  messages.scrollTop = messages.scrollHeight;
}

function adjustLayout() {
  textarea.style.height = "auto";
  let newHeight = textarea.scrollHeight;
  const maxHeight = lineHeight * maxRows;
  if (newHeight > maxHeight) {
    newHeight = maxHeight;
    textarea.style.overflowY = "scroll";
  } else {
    textarea.style.overflowY = "hidden";
  }
  textarea.style.height = `${newHeight}px`;
}

function refreshChat(messagesArray) {
  messages.innerHTML = "";
  messagesArray.forEach(({ sender, text }) => {
    addMessage(sender, text);
  });
  adjustLayout();
}
function updateSendButtonState() {
  if (sendForcedDisabled) {
    sendButton.disabled = true;
    sendButton.innerHTML = '<div class="loader"></div>';
  } else {
    sendButton.disabled = textarea.value.trim() === "";
    sendButton.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
  }
}
function clearChat() {
  alert("Chat deleted");
  const messages = document.querySelector(".messages");
  while (messages.firstChild) {
    messages.removeChild(messages.firstChild);
  }
}
function loadChat() {
  const localChat = localStorage.getItem("chat");

  if (localChat) {
    try {
      const parsedChat = JSON.parse(localChat);
      // Validate the parsed chat structure
      if (
        Array.isArray(parsedChat.message) &&
        Array.isArray(parsedChat.timestamp) &&
        Array.isArray(parsedChat.from_user)
      ) {
        chat = parsedChat;
        refreshChat(
          chat.message.map((message, index) => ({
            sender: chat.from_user[index] ? "user" : "assistant",
            text: message,
          })),
        );
        return;
      }
    } catch (error) {
      console.error("Error parsing local chat data:", error);
    }
  }

  // Clear invalid chat data from localStorage
  console.warn("Invalid or missing chat data. Clearing local storage.");
  localStorage.removeItem("chat");
}
