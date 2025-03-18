import { body, validationResult } from "express-validator";

export const validateOutProduct = [
  // Validate supplier_id
  body("supplier_id")
    .notEmpty()
    .withMessage("Supplier ID is required")
    .isMongoId()
    .withMessage("Valid supplier ID is required"),

  // Validate product_name
  body("product_name")
    .notEmpty()
    .withMessage("Product name is required")
    .isString()
    .withMessage("Product name must be a string"),

  // Validate unit_cost
  body("unit_cost")
    .notEmpty()
    .withMessage("Unit cost is required")
    .isFloat({ gt: 0 })
    .withMessage("Unit cost must be a positive number"),

  // Validate quantity
  body("quantity")
    .notEmpty()
    .withMessage("Quantity is required")
    .isInt({ gt: 0 })
    .withMessage("Quantity must be a positive integer"),

  // Handle validation errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    next();
  },
];