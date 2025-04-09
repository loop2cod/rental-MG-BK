import expressFormidable from "express-formidable";
import { sendResponse } from "./responseHandler.js";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Custom filename generator to preserve original filename while ensuring uniqueness
const generateUniqueFilename = (originalFilename) => {
  const fileExtension = path.extname(originalFilename);
  const fileNameWithoutExt = path.basename(originalFilename, fileExtension);
  const uniqueId = uuidv4().substring(0, 8); // Use shorter UUID for cleaner URLs
  
  return `${fileNameWithoutExt}-${uniqueId}${fileExtension}`;
};

// Middleware to handle form data with error handling
const parseForm = (req, res, next) => {
  try {
    expressFormidable({
      uploadDir,
      keepExtensions: true,
      multiples: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      filename: (name, ext, part, form) => {
        // Use the original filename but ensure uniqueness
        const originalFilename = part.filename;
        return generateUniqueFilename(originalFilename);
      }
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
      
      // Process file paths to generate URLs
      if (req.files) {
        Object.keys(req.files).forEach(fieldName => {
          if (Array.isArray(req.files[fieldName])) {
            req.files[fieldName].forEach(file => {
              // Replace full path with URL path
              file.url = `/uploads/${path.basename(file.path)}`;
            });
          } else {
            req.files[fieldName].url = `/uploads/${path.basename(req.files[fieldName].path)}`;
          }
        });
      }
      
      next();
    });
  } catch (error) {
    console.error("Unexpected Error:", error);
    sendResponse(res, 500, false, "Unexpected server error");
  }
};

export { parseForm };
