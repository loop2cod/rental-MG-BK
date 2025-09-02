import Product from "../models/ProductSchema.js";
import mongoose from "mongoose";

const generateProductCode = async () => {
  try {
    const lastProduct = await Product.findOne(
      { code: { $exists: true, $ne: null } },
      {},
      { sort: { code: -1 } }
    );
    
    if (!lastProduct || !lastProduct.code) {
      return "1";
    }
    
    // Convert to number and increment
    const lastCodeNumber = parseInt(lastProduct.code, 10);
    
    if (isNaN(lastCodeNumber)) {
      // If parsing fails, find the highest numeric value
      const products = await Product.find({
        code: { $exists: true, $ne: null, $regex: /^\d+$/ }
      }).sort({ code: -1 }).limit(1);
      
      if (products.length > 0) {
        return (parseInt(products[0].code, 10) + 1).toString();
      }
      return "1";
    }
    
    return (lastCodeNumber + 1).toString();
  } catch (error) {
    console.error("generateProductCode error => ", error);
    // Fallback: find max code numerically
    const products = await Product.find({
      code: { $exists: true, $ne: null, $regex: /^\d+$/ }
    }).sort({ code: -1 }).limit(1);
    
    if (products.length > 0) {
      return (parseInt(products[0].code, 10) + 1).toString();
    }
    return "1";
  }
};

export const updateExistingProductsWithCodes = async () => {
  try {
    console.log("Starting to update existing products with codes...");
    
    const productsWithoutCodes = await Product.find({
      $or: [
        { code: { $exists: false } },
        { code: null },
        { code: "" }
      ],
      isDeleted: false
    }).sort({ createdAt: 1 });

    console.log(`Found ${productsWithoutCodes.length} products without codes`);

    if (productsWithoutCodes.length === 0) {
      console.log("No products need code updates");
      return {
        success: true,
        message: "No products need code updates",
        updated: 0
      };
    }

    let counter = 1;
    const existingCodes = await Product.distinct("code", { 
      code: { $exists: true, $ne: null, $ne: "" } 
    });
    
    if (existingCodes.length > 0) {
      const maxCode = Math.max(...existingCodes.map(code => parseInt(code) || 0));
      counter = maxCode + 1;
    }

    const bulkOps = [];
    
    for (const product of productsWithoutCodes) {
      bulkOps.push({
        updateOne: {
          filter: { _id: product._id },
          update: { $set: { code: counter.toString() } }
        }
      });
      counter++;
    }

    const result = await Product.bulkWrite(bulkOps);
    
    console.log(`Updated ${result.modifiedCount} products with codes`);
    
    return {
      success: true,
      message: `Successfully updated ${result.modifiedCount} products with codes`,
      updated: result.modifiedCount
    };

  } catch (error) {
    console.error("Error updating existing products with codes:", error);
    return {
      success: false,
      message: "Error updating existing products with codes",
      error: error.message
    };
  }
};

export { generateProductCode };