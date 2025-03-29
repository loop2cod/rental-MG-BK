import express from "express";
import { isAuthenticated } from "../middlewares/authMiddleware.js";
import { getChartDataController, getDashboardDataController, getRecentBookingsController } from "../controllers/dashboardController.js";

const router = express.Router();

router.get("/data", isAuthenticated, getDashboardDataController);
router.get("/chart", isAuthenticated, getChartDataController);
router.get("/recent", isAuthenticated, getRecentBookingsController);

export default router; 