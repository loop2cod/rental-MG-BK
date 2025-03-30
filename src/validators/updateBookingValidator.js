import { body, validationResult, param } from "express-validator";

export const validateUpdateBooking = [
  


  // Validate from_date
  body("from_date")
    .notEmpty()
    .withMessage("from_date is required")
    .isDate({ format: "YYYY-MM-DD" })
    .withMessage("from_date must be in YYYY-MM-DD format"),

  // Validate to_date
  body("to_date")
    .notEmpty()
    .withMessage("to_date is required")
    .isDate({ format: "YYYY-MM-DD" })
    .withMessage("to_date must be in YYYY-MM-DD format"),

  // Validate from_time
  body("from_time")
    .notEmpty()
    .withMessage("from_time is required")
    .matches(/^\d{2}:\d{2}$/)
    .withMessage("from_time must be in HH:MM format"),

  // Validate to_time
  body("to_time")
    .notEmpty()
    .withMessage("to_time is required")
    .matches(/^\d{2}:\d{2}$/)
    .withMessage("to_time must be in HH:MM format"),

  // Validate booking_date
  body("booking_date")
    .notEmpty()
    .withMessage("booking_date is required")
    .isDate({ format: "YYYY-MM-DD" })
    .withMessage("booking_date must be in YYYY-MM-DD format"),

  // Validate booking_items
  body("booking_items")
    .notEmpty()
    .withMessage("booking_items is required")
    .isArray()
    .withMessage("booking_items must be an array"),

  // Validate outsourced_items
  body("outsourced_items")
    .optional()
    .isArray()
    .withMessage("outsourced_items must be an array"),

  // Validate total_quantity
  body("total_quantity")
    .notEmpty()
    .withMessage("total_quantity is required")
    .isFloat({ gt: 0 })
    .withMessage("total_quantity must be a positive integer"),

  // Validate amount_paid
  body("amount_paid")
    .notEmpty()
    .withMessage("amount_paid is required")
    .isFloat({ gt: 0 })
    .withMessage("amount_paid must be a positive number"),

  // Validate payment_method
  body("payment_method")
    .notEmpty()
    .withMessage("payment_method is required")
    .isString()
    .withMessage("payment_method must be a string")
    .isIn(["cash", "upi", "net_banking", "credit_card"]),

  // Validate total_amount
  body("total_amount")
    .notEmpty()
    .withMessage("total_amount is required")
    .isFloat({ gt: 0 })
    .withMessage("total_amount must be a positive number"),

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
