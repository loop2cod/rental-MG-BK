import express from "express";
import { isAuthenticated } from "../middlewares/authMiddleware.js";
import { addBookingController, listBookingsController } from "../controllers/bookingController.js";
import { validateBooking } from "../validators/bookingValidator.js";

const router = express.Router();

router.post("/add", isAuthenticated,validateBooking, addBookingController);
router.get("/list", isAuthenticated, listBookingsController);

export default router;