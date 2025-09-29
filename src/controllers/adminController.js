import {
  createStaffUser,
  getStaffUsers,
  deleteStaffUser,
  resetStaffPassword,
} from "../services/adminService.js";
import { sendResponse } from "../middlewares/responseHandler.js";

export const createStaff = async (req, res) => {
  const { name, mobile, password, user_role } = req.body;

  try {
    const response = await createStaffUser(name, mobile, password, user_role, req.user.userId);
    sendResponse(
      res,
      response.statusCode,
      response.success,
      response.message,
      response.data
    );
  } catch (error) {
    console.log("Error in createStaff: ", error);
    sendResponse(res, 500, false, "Internal server error");
  }
};

export const getStaff = async (req, res) => {
  try {
    const response = await getStaffUsers();
    sendResponse(
      res,
      response.statusCode,
      response.success,
      response.message,
      response.data
    );
  } catch (error) {
    console.log("Error in getStaff: ", error);
    sendResponse(res, 500, false, "Internal server error");
  }
};

export const deleteStaff = async (req, res) => {
  const { id } = req.params;

  try {
    const response = await deleteStaffUser(id);
    sendResponse(
      res,
      response.statusCode,
      response.success,
      response.message,
      response.data
    );
  } catch (error) {
    console.log("Error in deleteStaff: ", error);
    sendResponse(res, 500, false, "Internal server error");
  }
};

export const resetPassword = async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  try {
    const response = await resetStaffPassword(id, newPassword);
    sendResponse(
      res,
      response.statusCode,
      response.success,
      response.message,
      response.data
    );
  } catch (error) {
    console.log("Error in resetPassword: ", error);
    sendResponse(res, 500, false, "Internal server error");
  }
};