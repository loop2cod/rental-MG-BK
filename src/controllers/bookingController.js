import { sendResponse } from "../middlewares/responseHandler.js";
import {
  addBooking,
  bookingDetailsById,
  bookingView,
  cancelBooking,
  listBookings,
  listBookingWithoutPagination,
  updateBooking,
} from "../services/bookingService.js";

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
    console.log("addBookingController error: ", error);    
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

export const listBookingsWithoutPaginationController = async (req, res) => {
  try {
    const response = await listBookingWithoutPagination();
    sendResponse(
      res,
      response.statusCode,
      response.success,
      response.message,
      response.data
    );
  } catch (error) {
    console.log("listBookingsWithoutPaginationController error => ", error);
    sendResponse(res, 500, false, "Internal server error");
  }
};

export const updateBookingController = async (req, res) => {
  const { id } = req.params;
  try {
    const response = await updateBooking(id, req?.body);

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

export const getBookingDetailsController = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await bookingView(id);
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

export const bookingViewByIdController = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await bookingDetailsById(id);
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

export const cancelBookingController = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    const response = await cancelBooking(id, remarks);

    sendResponse(
      res,
      response.statusCode,
      response.success,
      response.message,
      response.data
    );
  } catch (error) {
    console.log("cancelBookingController error => ", error);
    sendResponse(res, 500, false, "Internal server error");
  }
};
