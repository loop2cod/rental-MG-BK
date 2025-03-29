import { sendResponse } from "../middlewares/responseHandler.js";
import {
  createOrder,
  getOrderBookingComparisonList,
  getOrderDetails,
  getOrderListWithPaginationAndSearch,
  handleOrderDispatch,
  handleOrderReturn,
  updateOrder,
} from "../services/orderService.js";

export const createOrderController = async (req, res) => {
  try {
    const response = await createOrder(req?.body);

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

export const updateOrderController = async (req, res) => {
  try {
    const response = await updateOrder(req?.body, req.user?._id);

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

export const getOrderDetailsController = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await getOrderDetails(id);

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

export const getOrdersWithPaginationSearchController = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const response = await getOrderListWithPaginationAndSearch(
      Number(page),
      Number(limit),
      search
    );

    sendResponse(
      res,
      response.statusCode,
      response.success,
      response.message,
      response.data
    );
  } catch (error) {
    console.error("getOrdersWithPaginationSearchController error => ", error);
    sendResponse(res, 500, false, "Internal server error");
  }
};

export const getOrdersComparisonController = async (req, res) => {
  try {
    const { orderId, bookingId } = req.body;
    const response = await getOrderBookingComparisonList(orderId, bookingId);
    sendResponse(res, 200, response.success, response.message, response.data);
  } catch (error) {
    console.error("getOrdersComparisonController error => ", error);
    sendResponse(res, 500, false, "Internal server error");
  }
};

export const handleOrderDispatchController = async (req, res) => {
  try {
    const { order_id, dispatch_data } = req.body;
    const response = await handleOrderDispatch(
      order_id,
      dispatch_data,
      req.user?._id
    );
    sendResponse(
      res,
      response.statusCode,
      response.success,
      response.message,
      response.data
    );
  } catch (error) {
    console.error("handleOrderDispatchController error => ", error);
    sendResponse(res, 500, false, "Internal server error");
  }
};

export const handleOrderReturnController = async (req, res) => {
  try {
    const { order_id, return_data } = req.body;
    const response = await handleOrderReturn(
      order_id,
      return_data,
      req.user?._id
    );

    sendResponse(
      res,
      response.statusCode,
      response.success,
      response.message,
      response.data
    );
  } catch (error) {
    console.error("handleOrderReturnController error => ", error);
    sendResponse(res, 500, false, "Internal server error");
  }
};
