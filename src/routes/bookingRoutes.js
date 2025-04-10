import express from "express";
import { isAuthenticated } from "../middlewares/authMiddleware.js";
import {
  addBookingController,
  bookingViewByIdController,
  cancelBookingController,
  getBookingDetailsController,
  listBookingsController,
  listBookingsWithoutPaginationController,
  updateBookingController,
} from "../controllers/bookingController.js";
import { validateBooking } from "../validators/bookingValidator.js";
import { validateUpdateBooking } from "../validators/updateBookingValidator.js";

const router = express.Router();

router.post("/add", isAuthenticated, validateBooking, addBookingController);
router.put(
  "/update/:id",
  isAuthenticated,
  validateUpdateBooking,
  updateBookingController
);
router.get("/list", isAuthenticated, listBookingsController);
router.get(
  "/list-without-pagination",
  isAuthenticated,
  listBookingsWithoutPaginationController
);
router.get("/view/:id", isAuthenticated, getBookingDetailsController);
router.get("/details/:id", isAuthenticated, bookingViewByIdController);
router.patch("/cancel/:id", isAuthenticated, cancelBookingController);

export default router;
