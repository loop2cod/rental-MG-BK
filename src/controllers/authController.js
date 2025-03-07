import { loginUser, signupUser } from "../services/authService.js";
import { sendResponse } from "../middlewares/responseHandler.js";

export const login = async (req, res) => {
  const { mobile, password } = req.body;

  const response = await loginUser(mobile, password);

  if (response.success) {
    sendResponse(res, 200, true, "Login successful", response);
  } else {
    sendResponse(res, 401, false, res.message);
  }
};

export const signup = async (req, res) => {
  const { mobile, password, name, user_role } = req.body;
  const response = await signupUser(mobile, password, name, user_role);
  if (response.success) {
    sendResponse(res, 200, true, "Signup successful", response);
  } else {
    sendResponse(res, 400, false, response);
  }
};
