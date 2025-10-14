const sendEmail = require("./sendEmail");

const sendOTP = async ({ to, otp, name = "User", userType = "admin" }) => {
  if (!to || !otp) throw new Error("Missing email or OTP");

  let subject = "";
  let panelName = "";

  if (userType === "admin") {
    subject = "🔐 Admin Panel Login OTP - NexKite ERP";
    panelName = "Admin Panel";
  } else if (userType === "teacher") {
    subject = "📘 Teacher Panel Login OTP - NexKite ERP";
    panelName = "Teacher Panel";
  } else {
    throw new Error("Invalid user type. Only admin and teacher are allowed.");
  }

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 25px; border: 1px solid #ddd; border-radius: 10px; background: #f9f9f9;">
      <h2 style="color: #1e88e5; margin-bottom: 10px;">Hello ${name},</h2>
      <p style="font-size: 16px; margin-bottom: 10px;">
        You are trying to log in to the <strong>${panelName}</strong> of <b>NexKite ERP</b>.
      </p>
      <p style="font-size: 15px; color: #333;">Please use the following One-Time Password (OTP) to complete your login:</p>
      
      <div style="text-align: center; margin: 25px 0;">
        <span style="display: inline-block; background: #d32f2f; color: #fff; font-size: 32px; font-weight: bold; padding: 15px 25px; border-radius: 8px; letter-spacing: 5px;">
          ${otp}
        </span>
      </div>
      
      <p style="font-size: 14px; color: #555; margin-bottom: 8px;">
        ⏳ This OTP is valid for <strong>10 minutes</strong>. Please do not share it with anyone.
      </p>
      <p style="font-size: 14px; color: #555;">
        If you did not request this login, please ignore this email immediately.
      </p>

      <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />

      <p style="font-size: 13px; color: #888; text-align: center;">
        © ${new Date().getFullYear()} NexKite ERP | Secure Login System
      </p>
    </div>
  `;

  await sendEmail({ to, subject, html });
};

module.exports = sendOTP;
