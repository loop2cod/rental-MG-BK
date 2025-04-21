import { body, validationResult } from "express-validator";

export const validateProduct = [
  body("name")
    .notEmpty()
    .withMessage("Product name is required")
    .isString()
    .withMessage("Product name must be a string"),

  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string"),

  body("images")
    .optional()
    .custom((value, { req }) => {
      if (!req.files?.images) return true;
      const images = Array.isArray(req.files.images)
        ? req.files.images
        : [req.files.images];
      return images.every((image) => typeof image.path === "string");
    }),

  body("unit_cost")
    .notEmpty()
    .withMessage("Unit cost is required")
    .isFloat({ gt: 0 })
    .withMessage("Unit cost must be a positive number"),

  body("category_id")
    .notEmpty()
    .withMessage("Category ID is required")
    .isMongoId()
    .withMessage("Valid category ID is required"),

  body("features")
    .optional({ nullable: true })
    .custom((value) => {
      try {
        const parsed = typeof value === 'string' ? JSON.parse(value || "{}") : value;
        return typeof parsed === "object" && !Array.isArray(parsed);
      } catch {
        return false;
      }
    })
    .withMessage("Features must be a valid object"),

  body("images")
    .optional()
    .custom((value, { req }) => {
      if (!req.files?.images) return true;
      const images = Array.isArray(req.files.images)
        ? req.files.images
        : [req.files.images];
      return images.every((image) => typeof image.path === "string");
    })
    .withMessage("Each image must be a valid file"),

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
