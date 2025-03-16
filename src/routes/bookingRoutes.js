import express from "express";
import { isAuthenticated } from "../middlewares/authMiddleware.js";
import { addBookingController } from "../controllers/bookingController.js";
import { validateBooking } from "../validators/bookingValidator.js";

const router = express.Router();

router.post("/add", isAuthenticated,validateBooking, addBookingController);

export default router;