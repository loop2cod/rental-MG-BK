import { sendResponse } from "../middlewares/responseHandler.js";
import { addBooking } from "../services/bookingService.js";

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
