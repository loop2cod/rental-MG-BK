import { body, validationResult } from "express-validator";

export const validatePayment = [
  body("booking_id")
    .notEmpty()
    .withMessage("booking_id is required")
    .isString()
    .withMessage("booking_id must be a string"),

  body("amount_paid")
    .notEmpty()
    .withMessage("amount_paid is required")
    .isFloat({ gt: 0 })
    .withMessage("amount_paid must be a positive number"),

  body("total_amount")
    .notEmpty()
    .withMessage("total_amount is required")
    .isFloat({ gt: 0 })
    .withMessage("total_amount must be a positive number"),

  body("payment_method")
    .notEmpty()
    .withMessage("payment_method is required")
    .isString()
    .withMessage("payment_method must be a string")
    .isIn(["credit_card", "debit_card", "upi", "net_banking", "cash"])
    .withMessage(
      "payment_method must be one of: cash, credit_card, debit_card, upi,net_banking"
    ),

  body("stage")
    .notEmpty()
    .withMessage("stage is required")
    .isString()
    .withMessage("stage must be a string")
    .isIn(["booking", "order", "return", "other"])
    .withMessage("stage must be one of: booking, order, return, other"),

  // Custom validator to ensure amount_paid does not exceed total_amount
  body("amount_paid").custom((value, { req }) => {
    if (value > req.body.total_amount) {
      throw new Error("amount_paid must not exceed total_amount");
    }
    return true;
  }),

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
