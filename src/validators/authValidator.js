import { body, validationResult } from "express-validator";

export const validateLogin = [
  body("mobile")
    .notEmpty()
    .withMessage("Mobile number is required")
    .isNumeric()
    .withMessage("Mobile number must be numeric")
    .isLength({ min: 10, max: 10 })
    .withMessage("Mobile number must be 10 digits"),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),

  (req, res, next) => {
    console.log("body => ", req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("errors => ", errors);
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  },
];

export const validateSignup = [
  body("mobile")
    .notEmpty()
    .withMessage("Mobile number is required")
    .isNumeric()
    .withMessage("Mobile number must be numeric")
    .isLength({ min: 10, max: 10 })
    .withMessage("Mobile number must be 10 digits"),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),

  body("name").notEmpty().withMessage("Name is required"),

  body("user_role").notEmpty().withMessage("User role is required"),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  },
];
