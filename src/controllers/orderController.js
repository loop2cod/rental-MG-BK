import { sendResponse } from "../middlewares/responseHandler.js";
import { createOrder, updateOrder } from "../services/orderService.js";

export const createOrderController = async (req, res) => {
  try {
    console.log("body=>", req?.body);
    
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
