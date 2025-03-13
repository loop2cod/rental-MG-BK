import express from "express";
import { validateLogin, validateSignup } from "../validators/authValidator.js";
import {parseForm} from "../middlewares/parseFormMiddleware.js";
import { addProduct } from "../controllers/inventoryController.js";
import { isAuthenticated } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/add-product", isAuthenticated, parseForm, addProduct);

export default router;
