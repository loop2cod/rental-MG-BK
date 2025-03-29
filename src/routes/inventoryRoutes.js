import express from "express";
import { parseForm } from "../middlewares/parseFormMiddleware.js";
import {
  addOutsourcedProductController,
  addProduct,
  deleteProduct,
  getAllOutsourcedProductsWithoutPaginationController,
  getAllProductsController,
  getAllProductsWithAvailableQuantityController,
  getAllProductsWithoutPaginationController,
  getOutProductsBasedOnsupplierControler,
  getProductDetailsController,
  updateProduct,
} from "../controllers/inventoryController.js";
import { isAuthenticated } from "../middlewares/authMiddleware.js";
import { validateProduct } from "../validators/productValidator.js";
import { validateOutProduct } from "../validators/outsourcedProductValidator.js";

const router = express.Router();

router.post(
  "/add-product",
  isAuthenticated,
  parseForm,
  validateProduct,
  addProduct
);

router.post(
  "/add-outsourced-product",
  isAuthenticated,
  validateOutProduct,
  addOutsourcedProductController
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
router.get(
  "/list-all-products",
  isAuthenticated,
  getAllProductsWithoutPaginationController
);
router.get(
  "/list-all-outsourced",
  isAuthenticated,
  getAllOutsourcedProductsWithoutPaginationController
);

router.get(
  "/get-product-details/:id",
  isAuthenticated,
  getProductDetailsController
);

router.get(
  "/list-outsourced/:supplier_id",
  isAuthenticated,
  getOutProductsBasedOnsupplierControler
);

router.get(
  "/list-all-products-with-available-quantity",
  isAuthenticated,
  getAllProductsWithAvailableQuantityController
);


export default router;
