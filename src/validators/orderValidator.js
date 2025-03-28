import { body, validationResult } from "express-validator";

export const validateOrder = [
  body("booking_id")
    .notEmpty()
    .withMessage("booking_id is required")
    .isString()
    .withMessage("booking_id must be a string"),

  body("no_of_days")
    .notEmpty()
    .withMessage("no_of_days is required")
    .isFloat({ gt: 0 })
    .withMessage("no_of_days must be a positive integer"),

  body("from_date")
    .notEmpty()
    .withMessage("from_date is required")
    .isDate({ format: "YYYY-MM-DD" })
    .withMessage("from_date must be in YYYY-MM-DD format"),

  body("to_date")
    .notEmpty()
    .withMessage("to_date is required")
    .isDate({ format: "YYYY-MM-DD" })
    .withMessage("to_date must be in YYYY-MM-DD format"),

  body("from_time")
    .notEmpty()
    .withMessage("from_time is required")
    .matches(/^\d{2}:\d{2}$/)
    .withMessage("from_time must be in HH:MM format"),

  body("to_time")
    .notEmpty()
    .withMessage("to_time is required")
    .matches(/^\d{2}:\d{2}$/)
    .withMessage("to_time must be in HH:MM format"),

  body("user_id")
    .notEmpty()
    .withMessage("user_id is required")
    .isString()
    .withMessage("user_id must be a string"),

  body("order_date")
    .notEmpty()
    .withMessage("order_date is required")
    .isDate({ format: "YYYY-MM-DD" })
    .withMessage("order_date must be in YYYY-MM-DD format"),

  body("order_items")
    .notEmpty()
    .withMessage("order_items is required")
    .isArray()
    .withMessage("order_items must be an array")
    .custom((items) => {
      items.forEach((item) => {
        if (
          typeof item.product_id !== "string" ||
          typeof item.quantity !== "number"
        ) {
          throw new Error(
            "Each item in order_items must have a 'product_id' as string and 'quantity' as number"
          );
        }
      });
      return true;
    }),

  body("outsourced_items")
    .optional()
    .isArray()
    .withMessage("outsourced_items must be an array"),

  body("total_amount")
    .notEmpty()
    .withMessage("total_amount is required")
    .isFloat({ gt: 0 })
    .withMessage("total_amount must be a positive number"),

  body("amount_paid")
    .notEmpty()
    .withMessage("amount_paid is required")
    .custom((value, { req }) => {
      if (value > req.body.total_amount) {
        throw new Error(
          "amount_paid must be less than or equal to total_amount"
        );
      }
      return true;
    }),

  body("created_by")
    .optional()
    .isString()
    .withMessage("created_by must be a string"),

  body("updated_by")
    .optional()
    .isString()
    .withMessage("updated_by must be a string"),

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
