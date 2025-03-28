import express from "express";
import { isAuthenticated } from "../middlewares/authMiddleware.js";
import { addPaymentController, updatePaymentController } from "../controllers/paymentController.js";

const router = express.Router();

router.post("/add", isAuthenticated, addPaymentController);
router.put("/update/:id", isAuthenticated, updatePaymentController);

export default router;