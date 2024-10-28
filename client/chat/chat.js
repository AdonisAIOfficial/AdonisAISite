// Init
const ws = new WebSocket("ws://localhost:3000");
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
let pendingChunks = 0;
ws.onopen = function () {
  // Authenticate upon connection open.
  ws.send(
    JSON.stringify({
      op: "auth",
      email: "example@gmail.com",
      access_token: "123testing",
    }),
  );
};
ws.onmessage = async (event) => {
  // const message = await event.data.text();
  const message = event.data;
  console.log("Message from server: ", message);
  const json = JSON.parse(message);
  switch (json.op) {
    case "auth_res":
      if (json.code == 200) {
        console.log("Authenticated successfully.");
      } else {
        console.log(
          "Problem with authentication. Redirecting to https://adonis-ai.com/enter",
        );
        window.location.href = `${getBaseURL()}/enter`;
      }
      break;
  }
  if (json.op == "end") {
    // Ensure all chunks are processed before setting lastMessageDiv to null
    const checkChunksDone = setInterval(() => {
      if (pendingChunks === 0) {
        lastMessageDiv = null;
        sendForcedDisabled = false;
        updateSendButtonState();
        adjustLayout();
        clearInterval(checkChunksDone);
      }
    }, 100);
  } else if (json.op == "ch") {
    addChunk(json.ch);
    adjustLayout();
  }
  /**
    if (event.data.operation === "load") {
    addMessage(event.data.sender, event.data.message);
    adjustLayout();
  } else if (event.data.operation === "stream") {
    addChunk(event.data.chunk);
    adjustLayout();
  } else if (event.data.operation === "end") {
    // Ensure all chunks are processed before setting lastMessageDiv to null
    const checkChunksDone = setInterval(() => {
      if (pendingChunks === 0) {
        lastMessageDiv = null;
        sendForcedDisabled = false;
        updateSendButtonState();
        adjustLayout();
        clearInterval(checkChunksDone);
      }
    }, 100);
  } else if (event.data.operation === "clearChat") {
    clearChat();
  }
   */
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
  window.parent.postMessage(
    { operation: "feedback", feedback: feedbackTextarea.value },
    "*",
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
  window.parent.postMessage({ operation: "to_settings" }, "*");
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
  const messageText = textarea.value.trim();
  if (messageText !== "") {
    addMessage("user", messageText);
    textarea.value = "";
    sendButton.disabled = true;
    sendForcedDisabled = true;
    updateSendButtonState();
    adjustLayout();
    ws.send(JSON.stringify({ op: "msg", msg: messageText }));
  }
}
function formatText(text) {
  return text
    .replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>") // ***text***
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // **text**
    .replace(/\*(.*?)\*/g, "<em>$1</em>") // *text*
    .replace(/\*/g, ""); // Remove any remaining asterisks
}
function addMessage(sender, text) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${sender}`;

  // Apply formatting rules
  text = formatText(text); // Remove any remaining asterisks

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

let lastMessageDiv = null;
function addChunk(chunk) {
  if (!lastMessageDiv) {
    lastMessageDiv = document.createElement("div");
    lastMessageDiv.className = "message assistant";
    messages.appendChild(lastMessageDiv);
  }

  const chunkElement = document.createElement("span");
  chunkElement.className = "chunk";
  chunkElement.innerHTML = chunk.replace(/ /g, "&nbsp;"); // replace spaces with non breaking spaces

  chunkElement.classList.add("reveal");
  lastMessageDiv.appendChild(chunkElement);

  // Increment pendingChunks counter
  pendingChunks++;
  messages.scrollTop = messages.scrollHeight;

  chunkElement.addEventListener("animationend", () => {
    if (chunkElement.classList.contains("reveal")) {
      const consolidatedSpan = document.createElement("span");
      consolidatedSpan.className = "consolidated-text";
      consolidatedSpan.innerHTML = chunkElement.innerHTML.replace(
        /&nbsp;/g,
        " ",
      );
      consolidatedSpan.innerHTML = formatText(consolidatedSpan.innerHTML);
      lastMessageDiv.replaceChild(consolidatedSpan, chunkElement);

      // Decrement pendingChunks counter and check if all chunks are resolved
      pendingChunks--;
      if (pendingChunks === 0 && lastMessageDiv.childElementCount === 0) {
        lastMessageDiv = null;
      }

      messages.scrollTop = messages.scrollHeight;
    }
  });
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
function getBaseURL() {
  const { hostname } = window.location;
  return hostname === "localhost"
    ? "http://localhost:3000"
    : "https://adonis-ai.com";
}
