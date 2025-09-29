import express from "express";
import {
  getPurchaseReports,
  getInventoryReports,
  getSupplierReports,
  getFinancialReports,
  getDashboardOverview
} from "../controllers/reportsController.js";
import { isAuthenticated, requireAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// All report routes require authentication and admin role
router.use(isAuthenticated, requireAdmin);

// Purchase Reports
router.get("/purchase", getPurchaseReports);

// Inventory Reports
router.get("/inventory", getInventoryReports);

// Supplier Reports
router.get("/supplier", getSupplierReports);

// Financial Reports
router.get("/financial", getFinancialReports);

// Dashboard Overview
router.get("/dashboard", getDashboardOverview);

export default router;