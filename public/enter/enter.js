const passwordInput = document.getElementById("passwordInput");
const togglePassword = document.getElementById("togglePassword");
const passwordError = document.getElementById("passwordError");
const emailError = document.getElementById("emailError");
const verifyContainer = document.getElementById("verifyContainer");
const verifyMessage = document.getElementById("verifyMessage");
const verificationCodeInput = document.getElementById("verificationCodeInput");
const title = document.getElementById("title");
const codeError = document.getElementById("codeError");
const enterButton = document.querySelector('button[type="submit"]');

togglePassword.addEventListener("click", function () {
  const type =
    passwordInput.getAttribute("type") === "password" ? "text" : "password";
  passwordInput.setAttribute("type", type);

  // Change the eye icon
  if (type === "password") {
    togglePassword.innerHTML = '<i class="fas fa-eye"></i>';
  } else {
    togglePassword.innerHTML = '<i class="fas fa-eye-slash"></i>';
  }
});

const form = document.getElementById("loginForm");
form.addEventListener("submit", function (event) {
  event.preventDefault(); // Prevent form submission

  // Disable the button to prevent double submission
  enterButton.disabled = true;

  const email = document.getElementById("emailInput").value;
  const password = passwordInput.value;

  // Validate password length (6-25 characters)
  if (password.length >= 6 && password.length <= 25) {
    // Construct the Gmail URL with the specific email address and filter
    const gmailLink = `https://mail.google.com/mail/u/${email}/#search/from%3Ano.reply.adonis.ai%40gmail.com`;
    document.getElementById("verificationLink").setAttribute("href", gmailLink);

    // Send data to parent page (assuming parent is on the same domain)
    window.parent.postMessage({ email, password }, "*");
  } else {
    // Re-enable the button and notify user about password length
    enterButton.disabled = false;
    alert("Password must be between 6 and 25 characters long.");
  }
});

// Listen for messages from parent page
window.addEventListener("message", function (event) {
  if (event.data === "{incorrect_password}") {
    // Re-enable the button and show password error
    enterButton.disabled = false;
    passwordError.style.display = "block";
    setTimeout(function () {
      passwordError.style.opacity = "0";
      setTimeout(function () {
        passwordError.style.display = "none";
        passwordError.style.opacity = "1";
      }, 300); // Reset opacity after fade out
    }, 3000); // Fade out after 3 seconds
  } else if (event.data === "{temporary_email}") {
    // Re-enable the button and show email error
    enterButton.disabled = false;
    emailError.style.display = "block";
    setTimeout(function () {
      emailError.style.opacity = "0";
      setTimeout(function () {
        emailError.style.display = "none";
        emailError.style.opacity = "1";
      }, 300); // Reset opacity after fade out
    }, 3000); // Fade out after 3 seconds
  } else if (event.data === "{verify}") {
    // Hide the login form, title, and show the verification message and input box
    form.classList.add("hidden");
    title.classList.add("hidden");
    verifyContainer.classList.add("show");
  } else if (event.data === "{verified}") {
    // Collapse the box entirely
    verifyContainer.style.display = "none";
  } else if (event.data === "{incorrect_code}") {
    // Re-enable the button and show incorrect code error
    enterButton.disabled = false;
    codeError.style.display = "block";
    setTimeout(function () {
      codeError.style.opacity = "0";
      setTimeout(function () {
        codeError.style.display = "none";
        codeError.style.opacity = "1";
      }, 300); // Reset opacity after fade out
    }, 3000); // Fade out after 3 seconds
  } else {
    // Reset errors and show login form
    passwordError.style.display = "none";
    emailError.style.display = "none";
    verifyContainer.classList.remove("show");
    form.classList.remove("hidden");
    title.classList.remove("hidden");
  }
});

// Handle verification code input
verificationCodeInput.addEventListener("input", function () {
  const verificationCode = verificationCodeInput.value.trim();

  // Automatically send verification code if 6 digits are entered
  if (verificationCode.length === 6) {
    // Send verification code to parent page (assuming parent is on the same domain)
    window.parent.postMessage({ verificationCode }, "*");
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
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  }
}

function createParticles() {
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
          Math.pow(particles[a].y - particles[b].y, 2)
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
