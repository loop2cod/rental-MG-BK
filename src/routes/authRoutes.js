import express from "express";
import {
  login,
  signup,
  logout,
  refresh,
  checkAuth,
  getUser,
} from "../controllers/authController.js";
import { validateLogin, validateSignup } from "../validators/authValidator.js";
import { isAuthenticated } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/login", validateLogin, login);
router.post("/signup", validateSignup, signup);
router.post("/logout", isAuthenticated, logout);
router.post("/refresh", refresh);
router.post("/check-auth", checkAuth);
router.get("/get-user", isAuthenticated, getUser);

export default router;
