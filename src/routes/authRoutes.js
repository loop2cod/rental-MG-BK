import express from "express";
import { login, signup, logout, refresh } from "../controllers/authController.js";
import { validateLogin, validateSignup } from "../validators/authValidator.js";

const router = express.Router();

router.post("/login", validateLogin, login);
router.post("/signup", validateSignup, signup);
router.post("/logout", logout);
router.post("/refresh", refresh);

export default router;
