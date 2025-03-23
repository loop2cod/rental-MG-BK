import express from "express";
import {
  addSupplier,
  getAllSuppliersWithoutPaginationController,
  listSuppliersController,
  updateSupplierController,
} from "../controllers/supplierController.js";
import { isAuthenticated } from "../middlewares/authMiddleware.js";
import { validateSupplier } from "../validators/supplierValidator.js";

const router = express.Router();

// Create a new supplier
router.post("/add", isAuthenticated, validateSupplier, addSupplier);
router.put(
  "/update/:id",
  isAuthenticated,
  validateSupplier,
  updateSupplierController
);
router.get(
  "/list-all",
  isAuthenticated,
  getAllSuppliersWithoutPaginationController
);
router.get("/list", isAuthenticated, listSuppliersController);

export default router;
