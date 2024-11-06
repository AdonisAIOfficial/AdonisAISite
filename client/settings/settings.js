const protocol = window.location.protocol === "https:" ? "wss://" : "ws://";
const ws = new WebSocket(`${protocol}${window.location.hostname}:3000`);
const subscribeButton = document.getElementById("subscribe");
const unsubscribeButton = document.getElementById("unsubscribe");
subscribeButton.addEventListener("click", () => {
  window.parent.postMessage("!{to_pay}!", "*");
});
unsubscribeButton.addEventListener("click", () => {
  window.parent.postMessage("!{to_cancel}!", "*");
});
ws.onopen = function () {
  // If user doesn't have email or auth token, don't even bother wasting the servers resources checking. Just send to /enter page.
  if (!localStorage.getItem("email") || !localStorage.getItem("auth_token"))
    window.location.href = window.location.origin + "/enter";
  // Authenticate upon connection open.
  ws.send(
    JSON.stringify({
      op: "auth",
      email: localStorage.getItem("email"),
      token: localStorage.getItem("auth_token"),
    }),
  );
};
ws.onmessage = async (event) => {
  const message = event.data;
  console.log("Message from server: ", message);
  const json = JSON.parse(message);
  switch (json.op) {
    case "auth_res":
      if (json.code == 200) {
        console.log("Authenticated successfully.");
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
  }
};

const sidebarButtons = document.querySelectorAll(".sidebar button");
const contentSections = document.querySelectorAll(".main-content");
const deleteChatButton = document.querySelector(".delete-chat-button");
const confirmBox = document.querySelector(".confirm-box");
const cancelButton = document.querySelector(".cancel-button");
const confirmButton = document.querySelector(".confirm-button");
const overlay = document.querySelector(".overlay");

deleteChatButton.addEventListener("click", () => {
  confirmBox.style.display = "flex";
  overlay.style.display = "block";
  overlay.style.pointerEvents = "all";
});

cancelButton.addEventListener("click", () => {
  confirmBox.style.display = "none";
  overlay.style.display = "none";
  overlay.style.pointerEvents = "none";
});

confirmButton.addEventListener("click", () => {
  confirmBox.style.display = "none";
  overlay.style.display = "none";
  window.parent.postMessage("!{deleteChat}!", "*");
  if (document.getElementById("toggleMemory").checked) {
    window.parent.postMessage("!{clearMemory}!", "*");
  }
});

sidebarButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.getAttribute("data-target");
    contentSections.forEach((section) => {
      section.classList.remove("active");
      if (section.id === target) {
        section.classList.add("active");
      }
    });
  });
});

const modes = ["light-mode", "dark-mode", "dark-red-mode"];
let mode;

function loadTheme() {
  document.body.classList.remove(modes[mode]);
  mode = parseInt(localStorage.getItem("toggledMode"));
  if (isNaN(mode)) {
    mode = 0;
  }
  document.body.classList.add(modes[mode]);
}

const returnToChatButton = document.querySelector(".return-to-chat-button");
returnToChatButton.addEventListener("click", function () {
  window.location.href = window.location.origin; // Will redirect to chat (at /).
});

const logoutButton = document.querySelector(".logout-button");
logoutButton.addEventListener("click", function () {
  localStorage.removeItem("email");
  localStorage.removeItem("auth_token");
  window.location.href = window.location.origin + "/enter";
});

window.onmessage = (event) => {
  loadTheme();
  if (event.data.operation == "updateStats") {
    if (event.data.stats.isSubscribed == true) {
      subscribeButton.style.display = "none";
      unsubscribeButton.style.display = "block";
    } else {
      subscribeButton.style.display = "block";
      unsubscribeButton.style.display = "none";
    }
  }
};

document.getElementById("account-data").classList.add("active");
