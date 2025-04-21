import { sendResponse } from "../middlewares/responseHandler.js";
import {
  addProductToInventory,
  updateProductOfInventory,
  deleteProductOfInventory,
  getAllProducts,
  getAllProductsWithoutPagination,
  getAllOutsourcedProductsWithoutPagination,
  getProductDetails,
  addOutsourcedProduct,
  getOutsourcedProductsBasedOnSupplier,
  getAllProductsWithAvailableQuantity,
} from "../services/inventoryService.js";

export const addProduct = async (req, res) => {
  try {
    const { body } = req;
    const response = await addProductToInventory(body, req.user?._id);
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

export const addOutsourcedProductController = async (req, res) => {
  try {
    const response = await addOutsourcedProduct(req?.body, req.userId);

    sendResponse(res, 200, response.success, response.message, response.data);
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

export const getAllProductsController = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const response = await getAllProducts(Number(page), Number(limit), search);

    sendResponse(
      res,
      response.statusCode,
      response.success,
      response.message,
      response.data
    );
  } catch (error) {
    console.log("getAllProductsController error => ", error);

    sendResponse(res, 500, false, "Internal server error");
  }
};

export const getAllProductsWithoutPaginationController = async (req, res) => {
  try {
    const response = await getAllProductsWithoutPagination();

    sendResponse(
      res,
      response.statusCode,
      response.success,
      response.message,
      response.data
    );
  } catch (error) {
    console.log("getAllProductsWithoutPaginationController error => ", error);

    sendResponse(res, 500, false, "Internal server error");
  }
};

export const getAllOutsourcedProductsWithoutPaginationController = async (
  req,
  res
) => {
  try {
    const response = await getAllOutsourcedProductsWithoutPagination();

    sendResponse(
      res,
      response.statusCode,
      response.success,
      response.message,
      response.data
    );
  } catch (error) {
    console.log(
      "getAllOutsourcedProductsWithoutPaginationController error => ",
      error
    );

    sendResponse(res, 500, false, "Internal server error");
  }
};

export const getProductDetailsController = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await getProductDetails(id);

    sendResponse(
      res,
      response.statusCode,
      response.success,
      response.message,
      response.data
    );
  } catch (error) {
    console.log("getProductDetailsController error => ", error);
    sendResponse(res, 500, false, "Internal server error");
  }
};

export const getOutProductsBasedOnsupplierControler = async (req, res) => {
  try {
    const { supplier_id } = req.params;
    const response = await getOutsourcedProductsBasedOnSupplier(supplier_id);

    sendResponse(
      res,
      response.statusCode,
      response.success,
      response.message,
      response.data
    );
  } catch (error) {
    console.log("getProductDetailsController error => ", error);
    sendResponse(res, 500, false, "Internal server error");
  }
};

export const getAllProductsWithAvailableQuantityController = async (
  req,
  res
) => {
  try {
    const response = await getAllProductsWithAvailableQuantity();

    sendResponse(
      res,
      response.statusCode,
      response.success,
      response.message,
      response.data
    );
  } catch (error) {
    console.log(
      "getAllProductsWithAvailableQuantityController error => ",
      error
    );
    sendResponse(res, 500, false, "Internal server error");
  }
};
