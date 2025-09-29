import express from "express";
import {
  createStaff,
  getStaff,
  deleteStaff,
  resetPassword,
} from "../controllers/adminController.js";
import { isAuthenticated, requireAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// All admin routes require authentication and admin role
router.post("/create-staff", isAuthenticated, requireAdmin, createStaff);
router.get("/staff-users", isAuthenticated, requireAdmin, getStaff);
router.delete("/delete-staff/:id", isAuthenticated, requireAdmin, deleteStaff);
router.put("/reset-password/:id", isAuthenticated, requireAdmin, resetPassword);

export default router;