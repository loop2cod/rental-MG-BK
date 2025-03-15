import express from "express";
import {
  createCategory,
  deleteCategoryController,
  getAllCategory,
  updateCategoryController,
} from "../controllers/categoryController.js";
import { isAuthenticated } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/add", isAuthenticated, createCategory);
router.get("/all", isAuthenticated, getAllCategory);
router.put("/update/:id", isAuthenticated, updateCategoryController);
router.delete("/delete/:id", isAuthenticated, deleteCategoryController);

export default router;
