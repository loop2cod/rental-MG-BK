import { sendResponse } from "../middlewares/responseHandler.js";
import { addPayment, updatePayment } from "../services/paymentServices.js";

export const addPaymentController = async (req, res) => {
  try {
    const response = await addPayment(req?.body, req.user?.userId);

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

export const updatePaymentController = async (req, res) => {
  try {
    const response = await updatePayment(req?.body, req.user?.userId);

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
