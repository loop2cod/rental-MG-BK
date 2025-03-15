import express from "express";
import {
  addSupplier,
  getAllSuppliersWithoutPaginationController,
} from "../controllers/supplierController.js";
import { isAuthenticated } from "../middlewares/authMiddleware.js";
import { parseForm } from "../middlewares/parseFormMiddleware.js";

const router = express.Router();

// Create a new supplier
router.post("/add", isAuthenticated, parseForm, addSupplier);
router.get(
  "/list-all",
  isAuthenticated,
  getAllSuppliersWithoutPaginationController
);

export default router;
