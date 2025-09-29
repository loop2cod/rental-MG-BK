import {
  createPurchase,
  getAllPurchases,
  getPurchaseById,
  updatePurchaseStatus,
  deletePurchase,
  createBulkPurchases,
  getPurchaseReports,
  getPurchaseSummary,
} from "../services/purchaseService.js";
import { sendResponse } from "../middlewares/responseHandler.js";

export const addPurchase = async (req, res) => {
  try {
    const response = await createPurchase(req.body, req.user.userId);
    sendResponse(
      res,
      response.statusCode,
      response.success,
      response.message,
      response.data
    );
  } catch (error) {
    console.log("Error in addPurchase: ", error);
    sendResponse(res, 500, false, "Internal server error");
  }
};

export const getPurchases = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", supplier, status, dateFrom, dateTo } = req.query;
    
    const filters = {
      supplier,
      status,
      dateFrom,
      dateTo
    };

    const response = await getAllPurchases(
      parseInt(page),
      parseInt(limit),
      search,
      filters
    );
    sendResponse(
      res,
      response.statusCode,
      response.success,
      response.message,
      response.data
    );
  } catch (error) {
    console.log("Error in getPurchases: ", error);
    sendResponse(res, 500, false, "Internal server error");
  }
};

export const getPurchase = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await getPurchaseById(id);
    sendResponse(
      res,
      response.statusCode,
      response.success,
      response.message,
      response.data
    );
  } catch (error) {
    console.log("Error in getPurchase: ", error);
    sendResponse(res, 500, false, "Internal server error");
  }
};

export const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const response = await updatePurchaseStatus(id, status);
    sendResponse(
      res,
      response.statusCode,
      response.success,
      response.message,
      response.data
    );
  } catch (error) {
    console.log("Error in updateStatus: ", error);
    sendResponse(res, 500, false, "Internal server error");
  }
};

export const removePurchase = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await deletePurchase(id);
    sendResponse(
      res,
      response.statusCode,
      response.success,
      response.message,
      response.data
    );
  } catch (error) {
    console.log("Error in removePurchase: ", error);
    sendResponse(res, 500, false, "Internal server error");
  }
};

export const bulkUploadPurchases = async (req, res) => {
  try {
    const { purchases } = req.body;
    const response = await createBulkPurchases(purchases, req.user.userId);
    sendResponse(
      res,
      response.statusCode,
      response.success,
      response.message,
      response.data
    );
  } catch (error) {
    console.log("Error in bulkUploadPurchases: ", error);
    sendResponse(res, 500, false, "Internal server error");
  }
};

// Reporting Controllers
export const getPurchaseReportsData = async (req, res) => {
  try {
    const { supplier, status, dateFrom, dateTo } = req.query;
    
    const filters = {
      supplier,
      status,
      dateFrom,
      dateTo
    };

    const response = await getPurchaseReports(filters);
    sendResponse(
      res,
      response.statusCode,
      response.success,
      response.message,
      response.data
    );
  } catch (error) {
    console.log("Error in getPurchaseReportsData: ", error);
    sendResponse(res, 500, false, "Internal server error");
  }
};

export const getPurchaseSummaryData = async (req, res) => {
  try {
    const response = await getPurchaseSummary();
    sendResponse(
      res,
      response.statusCode,
      response.success,
      response.message,
      response.data
    );
  } catch (error) {
    console.log("Error in getPurchaseSummaryData: ", error);
    sendResponse(res, 500, false, "Internal server error");
  }
};