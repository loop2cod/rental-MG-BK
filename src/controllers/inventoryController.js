import { sendResponse } from "../middlewares/responseHandler.js";
import {
  addProductToInventory,
  updateProductOfInventory,
  deleteProductOfInventory,
} from "../services/inventoryService.js";

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

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { fields } = req;

    const response = await updateProductOfInventory(id, fields);

    sendResponse(res, 200, response.success, response.message, response.data);
  } catch (error) {
    sendResponse(res, 500, false, "Internal server error");
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const response = await deleteProductOfInventory(id);

    sendResponse(res, 200, response.success, response.message, response.data);
  } catch (error) {
    sendResponse(res, 500, false, "Internal server error");
  }
};
