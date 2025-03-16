import { sendResponse } from "../middlewares/responseHandler.js";
import { addBooking, listBookings } from "../services/bookingService.js";

export const addBookingController = async (req, res) => {
  try {
    const response = await addBooking(req?.body, req.user?._id);
    sendResponse(
      res,
      response.statusCode,
      response.success,
      response.message,
      response.data
    );
  } catch (error) {
    sendResponse(res, 500, false, "Internal server error");
  }
};

export const listBookingsController = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", type = "all" } = req.query;
    const response = await listBookings(
      Number(page),
      Number(limit),
      search,
      type
    );

    sendResponse(
      res,
      response.statusCode,
      response.success,
      response.message,
      response.data
    );
  } catch (error) {
    sendResponse(res, 500, false, "Internal server error");
  }
};
