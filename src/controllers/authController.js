import {
  loginUser,
  signupUser,
  logoutUser,
  getAuthToken,
} from "../services/authService.js";
import { sendResponse } from "../middlewares/responseHandler.js";

export const login = async (req, res) => {
  const { mobile, password } = req.body;

  try {
    const response = await loginUser(mobile, password, res);
    sendResponse(
      res,
      response.statusCode,
      response.success,
      response.message,
      response
    );
  } catch (error) {
    sendResponse(res, 500, false, "Internal server error");
  }
};

export const signup = async (req, res) => {
  const { mobile, password, name, user_role } = req.body;

  try {
    const response = await signupUser(mobile, password, name, user_role, res);
    sendResponse(
      res,
      response.statusCode,
      response.success,
      response.message,
      response
    );
  } catch (error) {
    sendResponse(res, 500, false, "Internal server error");
  }
};

export const logout = async (req, res) => {
  try {
    const response = logoutUser(res);
    sendResponse(res, response.statusCode, response.success, response.message);
  } catch (error) {
    sendResponse(res, 500, false, "Internal server error");
  }
};

export const refresh = async (req, res) => {
  try {
    const response = await getAuthToken(req, res);
    sendResponse(res, response.statusCode, response.success, response.message);
  } catch (error) {
    sendResponse(res, 500, false, "Internal server error");
  }
};
