const nodemailer = require("nodemailer");
const { NO_REPLY_ADONIS_AI_GMAIL_PASSKEY } = require("./secrets.js");
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: "no.reply.adonis.ai@gmail.com",
    pass: NO_REPLY_ADONIS_AI_GMAIL_PASSKEY,
  },
});
async function sendCode(email) {
  const code = generateCode();
  try {
    await transporter.sendMail({
      from: "no.reply.adonis.ai@gmail.com",
      to: email,
      subject: `Your verification code: ${code} | Adonis AI`,
      html: `
      <div style="text-align: center; font-size: 18px;">
          <p>Dear User,</p>
          <p>Here is your verification code:</p>
          <p style="font-weight: bold; font-size: 28px; line-height: 32px;">${code}</p>
        </div>
      `,
    });
    return code; // Email sent successfully
  } catch (error) {
    console.error("🟥 Error sending email:", error);
    return null; // Failed to send email
  }
}
function generateCode() {
  // Generate a random six-digit code
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += Math.floor(Math.random() * 10);
  }
  return code;
}
module.exports = { sendCode };
