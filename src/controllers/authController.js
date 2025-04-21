import {
  loginUser,
  signupUser,
  logoutUser,
  getAuthToken,
  checkAuthenticated,
} from "../services/authService.js";
import { sendResponse } from "../middlewares/responseHandler.js";

export const login = async (req, res) => {
  console.log("req.body => ", req.body);

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
  const { mobile, password, name, user_role, secondary_mobile } = req.body;

  try {
    const response = await signupUser(
      mobile,
      secondary_mobile,
      password,
      name,
      user_role,
      res
    );
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

export const checkAuth = async (req, res) => {
  try {
    const response = await checkAuthenticated(req, res);
    sendResponse(
      res,
      response.statusCode,
      response.success,
      response.message,
      response.data,
      response.sessionOut
    );
  } catch (error) {
    // console.log("Error in checkAuth: ", error);
    sendResponse(res, 500, false, "Internal server error");
  }
};
