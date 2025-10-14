const nodemailer = require("nodemailer");

const sendEmail = ({ to, subject, html }) => {
  return new Promise((resolve, reject) => {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.FROM_EMAIL, 
        pass: process.env.EMAIL_PASS, 
      },
    });

    const mailOptions = {
      from: `"Gaikwad Classes ERP" <${process.env.FROM_EMAIL}>`,
      to,
      subject: subject || "Notification from Gaikwad Classes ERP",
      html: html || `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #1e88e5;">Gaikwad Classes</h2>
          <p>This is a system-generated email from Gaikwad Classes ERP platform.</p>
        </div>
      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("❌ Email sending failed:", error);
        return reject(error);
      }
      console.log("✅ Email sent successfully:", info.response);
      resolve(info);
    });
  });
};

module.exports = sendEmail;
