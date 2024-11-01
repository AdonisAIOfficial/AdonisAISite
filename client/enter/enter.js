const passwordInput = document.getElementById("passwordInput");
const passwordError = document.getElementById("passwordError");
const emailError = document.getElementById("emailError");
const verifyContainer = document.getElementById("verifyContainer");
const verifyMessage = document.getElementById("verifyMessage");
const verificationCodeInput = document.getElementById("verificationCodeInput");
const title = document.getElementById("title");
const codeError = document.getElementById("codeError");
const enterButton = document.querySelector('button[type="submit"]');

function getBaseURL() {
  const { hostname } = window.location;
  return hostname === "localhost"
    ? "http://localhost:3000"
    : "https://adonis-ai.com";
}
const form = document.getElementById("loginForm");

form.addEventListener("submit", function (event) {
  event.preventDefault(); // Prevent form submission
  enterButton.disabled = true;

  const email = document.getElementById("emailInput").value;
  const password = passwordInput.value;

  // Validate password length (6-25 characters)
  if (password.length >= 6 && password.length <= 25) {
    // Save password and email for short period in sessionStorage and clear there after.
    // Also, using sessionStorage to avoid dealing with scopes.
    sessionStorage.setItem("email", email);
    sessionStorage.setItem("password", password);
    const gmailLink = `https://mail.google.com/mail/u/${email}/#search/from%3Ano.reply.adonis.ai%40gmail.com`;
    document.getElementById("verificationLink").setAttribute("href", gmailLink);

    fetch(`${getBaseURL()}/-/enter`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log(data);
        switch (data.op) {
          case "verifyEmail":
            // Hide the login form and show the verification code input
            form.classList.add("hidden");
            title.classList.add("hidden");
            verifyContainer.classList.add("show");
            sessionStorage.setItem("verificationId", data.verificationId);
            break;
          case "temporaryEmailForbidden":
            // Show temporary email forbidden message.
            emailError.style.display = "block";
            passwordError.style.display = "none";
            enterButton.disabled = false; // Re-enable Enter button.
            break;
          case "loginDenied":
            // Show password invalid message.
            passwordError.style.display = "block";
            emailError.style.display = "none";
            enterButton.disabled = false;
            break;
          case "loginApproved":
            emailError.style.display = "none"; // Hide email error message
            passwordError.style.display = "none"; // Hide password error message
            console.log("Login token: ", data.token);
            localStorage.setItem("login_token", data.token); // Save login token.
            window.location.href = "/"; // Redirect to chat.
            break;
        }
      })
      .catch((error) => console.error("Error:", error));
  } else {
    enterButton.disabled = false;
    alert("Password must be between 6 and 25 characters long.");
  }
});

// Handle verification code input and submission
verificationCodeInput.addEventListener("input", function () {
  const verificationCode = verificationCodeInput.value.trim();

  // Automatically send verification code if 6 digits are entered
  if (verificationCode.length === 6) {
    fetch(`${getBaseURL()}/-/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        verificationId: sessionStorage.getItem("verificationId"),
        code: verificationCode,
        email: sessionStorage.getItem("email"),
        password: sessionStorage.getItem("password"),
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.op == "verified") {
          console.log("Verification successful");
          // Remove saved email and password for safety.
          // Note: Could just use 'sessionStorage.clear()' to remove all at once and to simplify. but that could cause problems in the future if we need sessionStorage for something else on this page.
          localStorage.setItem("email", sessionStorage.getItem("email"));
          localStorage.setItem("login_token", data.token);
          sessionStorage.removeItem("email");
          sessionStorage.removeItem("password");
          sessionStorage.removeItem("verificationId");
          codeError.style.display = "none";
          verifyContainer.style.display = "none"; // Hide verification container
          window.location.href = "/"; // redirect to chat
        } else {
          console.log("Verification code is incorrect");
          verificationCodeInput.value = ""; // Clear the input field
          codeError.style.display = "block"; // Show error message
        }
      })
      .catch((error) => console.error("Error:", error));
  }
});

// Network animation script
const canvas = document.getElementById("networkCanvas");
const ctx = canvas.getContext("2d");
let particles = [];
let particleCount = 250;

function setupCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.scale(dpr, dpr);
}

setupCanvas();

window.addEventListener("resize", () => {
  setupCanvas();
});

class Particle {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = (Math.random() - 0.5) * 2;
    this.size = Math.random() * 2 + 1;
  }

  update() {
    if (this.x > canvas.width || this.x < 0) this.vx *= -1;
    if (this.y > canvas.height || this.y < 0) this.vy *= -1;
    this.x += this.vx;
    this.y += this.vy;
  }

  draw() {
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  }
}

function createParticles() {
  console.log("Particles Created");
  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }
}

function connectParticles() {
  let opacity = 1;
  for (let a = 0; a < particles.length; a++) {
    for (let b = a + 1; b < particles.length; b++) {
      let distance = Math.sqrt(
        Math.pow(particles[a].x - particles[b].x, 2) +
          Math.pow(particles[a].y - particles[b].y, 2),
      );

      if (distance < 100) {
        opacity = 1 - distance / 100;
        ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(particles[a].x, particles[a].y);
        ctx.lineTo(particles[b].x, particles[b].y);
        ctx.closePath();
        ctx.stroke();
      }
    }
  }
}

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach((p) => {
    p.update();
    p.draw();
  });
  connectParticles();
  requestAnimationFrame(animateParticles);
}

createParticles();
animateParticles();
