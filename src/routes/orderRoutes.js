import express from "express";
import { isAuthenticated } from "../middlewares/authMiddleware.js";
import {
  createOrderController,
  getOrderDetailsController,
  getOrdersComparisonController,
  getOrdersWithPaginationSearchController,
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
export default router;
