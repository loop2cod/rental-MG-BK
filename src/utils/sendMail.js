import nodemailer from "nodemailer";

// Configure transporter with Gmail SMTP
const transporter = nodemailer.createTransport({
  service: "gmail",
  secure: true,
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail email
    pass: process.env.EMAIL_PASS, // App password (not your Gmail password)
  },
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000, // 10 seconds
});

/**
 * Send an email using Nodemailer
 * @param {string|string[]} to - Single recipient email or array of recipient emails
 * @param {string} subject - Email subject
 * @param {string} html - HTML content for email body
 * @returns {Promise<{success: boolean, message: string}>}
 */
const sendEmail = async (to, subject, html) => {
  
  try {
    // Convert single email to array if necessary
    const recipients = Array.isArray(to) ? to : [to];

    // Validate recipients
    if (recipients.length === 0) {
      return {
        success: false,
        message: "No recipients provided",
      };
    }

    // Join multiple emails with commas
    const toField = recipients.join(", ");

    const mailOptions = {
      from: `"Rental Service" <${process.env.EMAIL_USER}>`,
      to: toField,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${toField}`);
    
    return {
      success: true,
      message: `Email sent successfully to ${recipients.length} recipient(s)`,
    };
  } catch (error) {
    console.error("Error sending email:", error);
    return {
      success: false,
      message: error.message || "Failed to send email",
    };
  }
};

export default sendEmail;
