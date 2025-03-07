import express from "express";
import { login, signup } from "../controllers/authController.js";
import { validateLogin, validateSignup } from "../validators/authValidator.js";

const router = express.Router();

router.post("/login", validateLogin, login);
router.post("/signup", validateSignup, signup);

export default router;
