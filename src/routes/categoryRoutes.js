import express from "express";
import { createCategory } from "../controllers/categoryController.js";
import { isAuthenticated } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/add", isAuthenticated, createCategory);

export default router;
