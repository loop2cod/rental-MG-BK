import { validationResult } from "express-validator";

export const validateProduct = [
  (req, res, next) => {
    const { fields, files } = req;
    const errors = [];

    // Validate name
    if (!fields?.name || typeof fields.name !== "string") {
      errors.push({
        msg: "Product name is required and must be a string",
        param: "name",
      });
    }

    // Validate unit_cost
    if (
      !fields?.unit_cost ||
      isNaN(fields.unit_cost) ||
      Number(fields.unit_cost) <= 0
    ) {
      errors.push({
        msg: "Unit cost is required and must be a positive number",
        param: "unit_cost",
      });
    }

    // Validate category_id
    if (!fields?.category_id || !/^[0-9a-fA-F]{24}$/.test(fields.category_id)) {
      errors.push({
        msg: "Valid category ID is required",
        param: "category_id",
      });
    }

    if (req.method === "PUT") {
      // Validate features (optional)
      if (
        fields.features &&
        typeof JSON.parse(fields.features || "{}") !== "object"
      ) {
        errors.push({
          msg: "Features must be a valid object",
          param: "features",
        });
      }

      // Validate images (optional)
      if (files?.images) {
        const images = Array.isArray(files.images)
          ? files.images
          : [files.images];
        if (!images.every((image) => typeof image.path === "string")) {
          errors.push({
            msg: "Each image must be a valid file",
            param: "images",
          });
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        errors,
      });
    }

    next();
  },
];
