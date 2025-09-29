import express from "express";
import {
  addPurchase,
  getPurchases,
  getPurchase,
  updateStatus,
  removePurchase,
  bulkUploadPurchases,
  getPurchaseReportsData,
  getPurchaseSummaryData,
} from "../controllers/purchaseController.js";
import { isAuthenticated, requireAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// All purchase routes require authentication and admin role
router.post("/add", isAuthenticated, requireAdmin, addPurchase);
router.post("/bulk-upload", isAuthenticated, requireAdmin, bulkUploadPurchases);
router.get("/list", isAuthenticated, requireAdmin, getPurchases);
router.get("/reports", isAuthenticated, requireAdmin, getPurchaseReportsData);
router.get("/summary", isAuthenticated, requireAdmin, getPurchaseSummaryData);
router.get("/:id", isAuthenticated, requireAdmin, getPurchase);
router.put("/:id/status", isAuthenticated, requireAdmin, updateStatus);
router.delete("/:id", isAuthenticated, requireAdmin, removePurchase);

export default router;