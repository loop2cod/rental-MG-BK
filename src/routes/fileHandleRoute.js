import express from "express";
import { generatePresignedUrlController } from "../controllers/fileHandleController.js";

const router = express.Router();

router.get("/generate-presigned-url", generatePresignedUrlController);

export default router;
