import { getChartData, getDashboardData, getRecentBookings } from "../services/dashboardService.js";
import { sendResponse } from "../middlewares/responseHandler.js";

export const getDashboardDataController = async (req, res) => {
  try {
    const response = await getDashboardData();
    sendResponse(
      res,
      response.statusCode,
      response.success,
      response.message,
      response.data
    );
  } catch (error) {
    console.error("getDashboardDataController error: ", error);
    sendResponse(res, 500, false, "Internal server error");
  }
}; 

export const getChartDataController = async (req, res) => {
  try {
    const response = await getChartData();
    sendResponse(
      res,
      response.statusCode,
      response.success,
      response.message,
      response.data
    );
  } catch (error) {
    console.error("getChartDataController error: ", error);
    sendResponse(res, 500, false, "Internal server error");
  }
};

export const getRecentBookingsController = async (req, res) => {
  try {
    const response = await getRecentBookings();
    sendResponse(
      res,
      response.statusCode,
      response.success,
      response.message,
      response.data
    );
  } catch (error) {
    console.error("getRecentBookingsController error: ", error);
    sendResponse(res, 500, false, "Internal server error");
  }
};