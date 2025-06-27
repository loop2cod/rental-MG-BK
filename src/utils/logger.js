import { createLogger, format, transports } from "winston";
import dotenv from "dotenv";
import Log from "../models/LogSchema.js";
import nodemailer from "nodemailer";
import "winston-mongodb"; // Import MongoDB transport

dotenv.config({ path: "./.env" });

const { combine, timestamp, printf } = format;

// Custom log format
const customFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${message}`;
});

// Nodemailer setup for email alerts
const transporter = nodemailer.createTransport({
  service: "Gmail",
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "contact.jithindas@gmail.com",
    pass: process.env.SMTP_MAIL_PASS,
  },
});

// Create Winston logger
const logger = createLogger({
  level: "info",
  format: combine(timestamp(), customFormat),
  transports: [
    new transports.Console(),
    new transports.MongoDB({
      db: process.env.MONGO_URI, // MongoDB connection string
      collection: "logs",
      level: "error", // Only store error logs in MongoDB
    }),
  ],
});

// "jdjithin97@gmail.com",
// Function to send email notifications for errors
const sendErrorEmail = async (logLevel, errorMessage) => {
  const mailOptions = {
    from: "contact.jithindas@gmail.com",
    to: ["nizamudheen318@gmail.com"], 
    subject: `Rental Management System - ${logLevel.toUpperCase()} Alert`,
    html: `<p><strong>${logLevel.toUpperCase()} Logged:</strong></p><p>${errorMessage}</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

// Automatically send email for error and warn logs
logger.on("data", (log) => {
  if (log.level === "error" || log.level === "warn") {
    sendErrorEmail(log.level, log.message);
  }
});

// logger.error("Database connection failed", { error: new Error("Connection timeout") });

export default logger;
