import express from "express";
import { isAuthenticated } from "../middlewares/authMiddleware.js";
import { createOrderController } from "../controllers/orderController.js";

const router = express.Router();

router.post("/create", isAuthenticated, createOrderController);

export default router;
