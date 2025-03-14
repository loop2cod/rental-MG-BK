import express from "express";
import { createCategory, getAllCategory } from "../controllers/categoryController.js";
import { isAuthenticated } from "../middlewares/authMiddleware.js";
import { deleteCategory, updateCategory } from "../services/categoryService.js";

const router = express.Router();

router.post("/add", isAuthenticated, createCategory);
router.get("/all", isAuthenticated, getAllCategory);
router.put("/update/:id", isAuthenticated, updateCategory);
router.delete("/delete/:id", isAuthenticated, deleteCategory);

export default router;
