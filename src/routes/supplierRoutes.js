import express from "express";
import {
  addSupplier,
  getAllSuppliersWithoutPaginationController,
  listSuppliersController,
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
router.get("/list", isAuthenticated, listSuppliersController);

export default router;
