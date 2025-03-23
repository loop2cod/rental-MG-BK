import { body, validationResult } from "express-validator";

export const validateSupplier = [
  // Validate name
  body("name")
    .notEmpty()
    .withMessage("Supplier name is required")
    .isString()
    .withMessage("Supplier name must be a string"),

  // Validate contact (optional)
  body("contact")
    .notEmpty()
    .withMessage("Contact number is required")
    .isLength({ min: 10, max: 10 })
    .withMessage("Contact number must be 10 digits")
    .isString()
    .withMessage("Contact must be a string"),

  // Validate address (optional)
  body("address").optional().isString().withMessage("Address must be a string"),

  // Custom middleware to handle the result of the validation
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
