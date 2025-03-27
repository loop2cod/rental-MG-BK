import { sendResponse } from "../middlewares/responseHandler.js";
import { createOrder } from "../services/orderService.js";


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