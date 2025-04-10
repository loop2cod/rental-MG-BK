import express from "express";
import { isAuthenticated } from "../middlewares/authMiddleware.js";
import {
  createOrderController,
  getOrderDetailsController,
  getOrdersComparisonController,
  getOrdersWithPaginationSearchController,
  handleDamagedOutsourcedProductsController,
  handleDamagedProductsController,
  handleOrderDispatchController,
  handleOrderReturnController,
  updateOrderController,
} from "../controllers/orderController.js";
import { validateOrder } from "../validators/orderValidator.js";

const router = express.Router();

router.post("/create", isAuthenticated, validateOrder, createOrderController);
router.put(
  "/update/:id",
  isAuthenticated,
  validateOrder,
  updateOrderController
);
router.get("/details/:id", isAuthenticated, getOrderDetailsController);
router.get(
  "/get-orders",
  isAuthenticated,
  getOrdersWithPaginationSearchController
);

router.get(
  "/get-order-comparison-list",
  isAuthenticated,
  getOrdersComparisonController
);

router.post("/order-dispatch", isAuthenticated, handleOrderDispatchController);

router.post("/order-return", isAuthenticated, handleOrderReturnController);

router.post(
  "/handle-damaged-products",
  isAuthenticated,
  handleDamagedProductsController
);

router.post(
  "/handle-damaged-outsourced-products",
  isAuthenticated,
  handleDamagedOutsourcedProductsController
);

export default router;
