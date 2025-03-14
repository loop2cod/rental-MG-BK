import express from "express";
import { createCategory, getAllCategory } from "../controllers/categoryController.js";
import { isAuthenticated } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/add", isAuthenticated, createCategory);
router.get("/all", isAuthenticated, getAllCategory);

export default router;
