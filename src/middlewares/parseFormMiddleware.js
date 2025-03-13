import expressFormidable from "express-formidable";
import { sendResponse } from "./responseHandler.js";
import fs from "fs";
import path from "path";

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Middleware to handle form data with error handling
const parseForm = (req, res, next) => {
  try {
    expressFormidable({
      uploadDir,
      keepExtensions: true,
      multiples: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    })(req, res, (err) => {
      if (err) {
        console.error("File Upload Error:", err);
        return sendResponse(
          res,
          err.message.includes("maxFileSize") ? 413 : 500,
          false,
          err.message.includes("maxFileSize")
            ? "File size exceeds the 10MB limit"
            : "File upload failed"
        );
      }
      next();
    });
  } catch (error) {
    console.error("Unexpected Error:", error);
    sendResponse(res, 500, false, "Unexpected server error");
  }
};

export { parseForm };
