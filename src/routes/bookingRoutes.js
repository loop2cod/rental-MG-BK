import express from "express";
import { isAuthenticated } from "../middlewares/authMiddleware.js";
import { addBookingController, cancelBookingController, getBookingDetailsController, listBookingsController, updateBookingController } from "../controllers/bookingController.js";
import { validateBooking } from "../validators/bookingValidator.js";
import { validateUpdateBooking } from "../validators/updateBookingValidator.js";

const router = express.Router();

router.post("/add", isAuthenticated,validateBooking, addBookingController);
router.put("/update/:id", isAuthenticated,validateUpdateBooking, updateBookingController);
router.get("/list", isAuthenticated, listBookingsController);
router.get("/view/:id", isAuthenticated, getBookingDetailsController);
router.patch("/cancel/:id", isAuthenticated, cancelBookingController);

export default router;