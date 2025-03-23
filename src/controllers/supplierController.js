import { sendResponse } from "../middlewares/responseHandler.js";
import {
  createSupplier,
  getAllSuppliersWithoutPagination,
  getAllSuppliersWithPagination,
  updateSupplier,
} from "../services/supplierService.js";

export const addSupplier = async (req, res) => {
  try {
    const { body, user } = req;
    const response = await createSupplier(body, user?._id);

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

export const updateSupplierController = async (req, res) => {
  try {
    const { id } = req.params;
    const { body } = req;

    const response = await updateSupplier(id, body);

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

export const listSuppliersController = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    
    const response = await getAllSuppliersWithPagination(
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
    console.log("listSuppliersController error => ", error);

    sendResponse(res, 500, false, "Internal server error");
  }
};
