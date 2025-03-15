import { sendResponse } from "../middlewares/responseHandler.js";
import { createSupplier, getAllSuppliersWithoutPagination } from "../services/supplierService.js";

export const addSupplier = async (req, res) => {
  try {
    const { fields, user } = req; 
    const response = await createSupplier(fields, user?._id);

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

export const getAllSuppliersWithoutPaginationController = async (req, res) => {
  try {
    const response = await getAllSuppliersWithoutPagination();

    sendResponse(
      res,
      response.statusCode,
      response.success,
      response.message,
      response.data
    );
  } catch (error) {
    console.log("getAllSuppliersWithoutPagination error => ", error);
    
    sendResponse(res, 500, false, "Internal server error");
  }
};