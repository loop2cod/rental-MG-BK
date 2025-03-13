import { sendResponse } from "../middlewares/responseHandler.js";
import { addProductToInventory } from "../services/inventoryService.js";

export const addProduct = async (req, res) => {
  try {
    const { fields, files, user } = req;
    const response = await addProductToInventory(fields, files, user?._id);
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
