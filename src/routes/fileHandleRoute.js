import express from "express";
import { deleteFileController, generatePresignedUrlController } from "../controllers/fileHandleController.js";

const router = express.Router();

router.get("/generate-presigned-url", generatePresignedUrlController);
router.delete("/delete-file", deleteFileController);

export default router;
