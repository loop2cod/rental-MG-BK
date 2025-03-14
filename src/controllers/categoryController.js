import { addCategory, listCategories } from "../services/categoryService.js";
import { sendResponse } from "../middlewares/responseHandler.js";

export const createCategory = async (req, res) => {
  try {
    const categoryData = {
      ...req.body,
      created_by: req.user._id,
      updated_by: req.user._id,
    };

    const response = await addCategory(categoryData);
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

export const getAllCategory = async (req, res) => {
  try {
    const response = await listCategories();
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
