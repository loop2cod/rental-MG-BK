import Product from "../models/ProductSchema.js";
import Inventory from "../models/InventorySchema.js";

export const addProductToInventory = async (fields, files, userId) => {
  try {
    const existingProduct = await Product.findOne({ name: fields.name });
    if (existingProduct) {
      return {
        success: false,
        message: "Product already exists",
        statusCode: 409,
      };
    }

    // Process uploaded files
    const images = [];
    if (files.images) {
      if (Array.isArray(files.images)) {
        files.images.forEach((file) => {
          images.push(file.path);
        });
      } else {
        images.push(files.images.path);
      }
    }

    // Create the product in the Product collection
    const newProduct = new Product({
      name: fields.name,
      unit_cost: fields.unit_cost,
      features: JSON.parse(fields.features || "{}"),
      images,
      category_id: fields.category_id,
      created_by: userId,
      updated_by: userId,
    });
    await newProduct.save();

    // Add the product to the Inventory collection
    const newInventoryItem = new Inventory({
      product_id: newProduct._id,
      quantity: fields.quantity || 0,
      created_by: userId,
      updated_by: userId,
    });
    await newInventoryItem.save();

    return {
      success: true,
      message: "Product added to inventory",
      statusCode: 201,
      data: {
        product: newProduct,
        inventory: newInventoryItem,
      },
    };
  } catch (error) {
    console.log("addProductToInventory error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};
