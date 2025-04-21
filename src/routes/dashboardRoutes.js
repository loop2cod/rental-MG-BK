import express from "express";
import { isAuthenticated } from "../middlewares/authMiddleware.js";
import {
  deleteAllNotificationsController,
  deleteSingleNotificationController,
  getChartDataController,
  getDashboardDataController,
  getNotificationsController,
  getRecentBookingsController,
} from "../controllers/dashboardController.js";

const router = express.Router();

router.get("/data", isAuthenticated, getDashboardDataController);
router.get("/chart", isAuthenticated, getChartDataController);
router.get("/recent", isAuthenticated, getRecentBookingsController);
router.get("/notifications", isAuthenticated, getNotificationsController);
router.delete(
  "/notification/:id",
  isAuthenticated,
  deleteSingleNotificationController
);
router.delete(
  "/notifications",
  isAuthenticated,
  deleteAllNotificationsController
);

export default router;
