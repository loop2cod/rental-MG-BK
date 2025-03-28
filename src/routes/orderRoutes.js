import express from "express";
import { isAuthenticated } from "../middlewares/authMiddleware.js";
import {
  createOrderController,
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

export default router;
