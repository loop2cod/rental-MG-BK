import Product from "../models/ProductSchema.js";

const generateProductCode = async () => {
  try {
    const [lastProduct] = await Product.aggregate([
      {
        $match: {
          code: { $exists: true, $ne: null, $ne: "", $regex: /^\d+$/ },
        },
      },
      {
        $addFields: {
          numericCode: { $toDouble: "$code" },
        },
      },
      { $sort: { numericCode: -1, createdAt: -1 } },
      { $limit: 1 },
    ]);

    if (
      !lastProduct ||
      typeof lastProduct.numericCode !== "number" ||
      Number.isNaN(lastProduct.numericCode)
    ) {
      return "1";
    }

    return (Math.trunc(lastProduct.numericCode) + 1).toString();
  } catch (error) {
    console.error("generateProductCode error => ", error);
    // Fallback: compute the max code numerically in application code
    const products = await Product.find({
      code: { $exists: true, $ne: null, $ne: "" },
    })
      .select("code")
      .lean();

    const maxNumericCode = products.reduce((max, product) => {
      if (typeof product.code !== "string") {
        return max;
      }

      const trimmedCode = product.code.trim();
      if (!/^\d+$/.test(trimmedCode)) {
        return max;
      }

      const numericValue = parseInt(trimmedCode, 10);
      return Number.isNaN(numericValue) ? max : Math.max(max, numericValue);
    }, 0);

    return (maxNumericCode + 1).toString();
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
