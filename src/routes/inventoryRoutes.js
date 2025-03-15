import express from "express";
import { parseForm } from "../middlewares/parseFormMiddleware.js";
import {
  addProduct,
  deleteProduct,
  getAllProductsController,
  updateProduct,
} from "../controllers/inventoryController.js";
import { isAuthenticated } from "../middlewares/authMiddleware.js";
import { validateProduct } from "../validators/productValidator.js";

const router = express.Router();

router.post(
  "/add-product",
  isAuthenticated,
  parseForm,
  validateProduct,
  addProduct
);
router.put(
  "/update-product/:id",
  isAuthenticated,
  parseForm,
  validateProduct,
  updateProduct
);
router.delete("/delete-product/:id", isAuthenticated, deleteProduct);
router.get("/all-products", isAuthenticated, getAllProductsController);

export default router;
