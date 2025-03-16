import Product from "../models/ProductSchema.js";
import Inventory from "../models/InventorySchema.js";
import OutsourcedProduct from "../models/OutsourcedProductSchema.js";

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
      description: fields.description,
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

export const updateProductOfInventory = async (productId, fields) => {
  try {
    // Validate if the product exists
    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return {
        success: false,
        message: "Product not found",
        statusCode: 404,
        data: null,
      };
    }

    // Validate if the new name is already taken by another product
    if (fields.name && fields.name !== existingProduct.name) {
      const productWithSameName = await Product.findOne({
        name: fields.name,
        _id: { $ne: productId }, // Exclude the current product
      });
      if (productWithSameName) {
        return {
          success: false,
          message: "Product name already exists",
          statusCode: 409,
          data: null,
        };
      }
    }

    // Update the product
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        name: fields.name,
        description: fields.description,
        unit_cost: fields.unit_cost,
        features: JSON.parse(fields.features || "{}"),
        images: fields.images,
        category_id: fields.category_id,
      },
      { new: true }
    );

    const updateQuantity = await Inventory.findOneAndUpdate(
      { product_id: productId },
      { quantity: fields.quantity || 0 },
      { new: true }
    );

    if (!updateQuantity) {
      return {
        success: false,
        message: "Product quantity not found",
        statusCode: 404,
        data: null,
      };
    }

    return {
      success: true,
      message: "Product updated",
      data: updatedProduct,
      statusCode: 200,
    };
  } catch (error) {
    console.log("updateInventory error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};

export const deleteProductOfInventory = async (productId) => {
  try {
    const isAlreadyDeleted = await Product.findById(productId);
    console.log("isAlreadyDeleted => ", isAlreadyDeleted);

    if (isAlreadyDeleted?.isDeleted) {
      return {
        success: false,
        message: "Product is already deleted",
        statusCode: 400,
      };
    }

    const product = await Product.findByIdAndUpdate(productId, {
      isDeleted: true,
    });

    return {
      success: true,
      message: "Product deleted",
      statusCode: 200,
    };
  } catch (error) {
    console.log("deleteInventory error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};

export const getAllProducts = async (
  page = 1,
  limit = 10,
  searchKeyword = ""
) => {
  try {
    const skip = (page - 1) * limit;
    const baseMatchCondition = { isDeleted: false };

    // Fetch products with inventory details and category name
    const [productsWithInventory, totalCountResult] = await Promise.all([
      Product.aggregate([
        { $match: baseMatchCondition }, // Filter out deleted products initially
        {
          $lookup: {
            from: "categories",
            localField: "category_id",
            foreignField: "_id",
            as: "categoryDetails",
          },
        },
        {
          $lookup: {
            from: "inventories",
            localField: "_id",
            foreignField: "product_id",
            as: "inventoryDetails",
          },
        },
        {
          $addFields: {
            inventoryQuantity: {
              $ifNull: [{ $arrayElemAt: ["$inventoryDetails.quantity", 0] }, 0],
            },
            categoryName: {
              $ifNull: [{ $arrayElemAt: ["$categoryDetails.name", 0] }, ""],
            },
          },
        },
        // Apply search conditions after lookups
        ...(searchKeyword
          ? [
              {
                $match: {
                  $or: [
                    ...(isNaN(searchKeyword)
                      ? [
                          { name: { $regex: searchKeyword, $options: "i" } },
                          {
                            description: {
                              $regex: searchKeyword,
                              $options: "i",
                            },
                          },
                          {
                            categoryName: {
                              $regex: searchKeyword,
                              $options: "i",
                            },
                          }, // Search categoryName
                          {
                            $expr: {
                              $gt: [
                                {
                                  $size: {
                                    $filter: {
                                      input: { $objectToArray: "$features" },
                                      as: "feature",
                                      cond: {
                                        $or: [
                                          {
                                            $regexMatch: {
                                              input: "$$feature.k",
                                              regex: searchKeyword,
                                              options: "i",
                                            },
                                          },
                                          {
                                            $regexMatch: {
                                              input: "$$feature.v",
                                              regex: searchKeyword,
                                              options: "i",
                                            },
                                          },
                                        ],
                                      },
                                    },
                                  },
                                },
                                0,
                              ],
                            },
                          },
                        ]
                      : [
                          { unit_cost: Number(searchKeyword) },
                          { inventoryQuantity: Number(searchKeyword) },
                        ]),
                  ],
                },
              },
            ]
          : []),
        {
          $project: {
            inventoryDetails: 0,
            categoryDetails: 0,
          },
        },
        { $skip: skip },
        { $limit: limit },
      ]),

      // Get the correct total count (without $skip and $limit)
      Product.aggregate([
        { $match: baseMatchCondition }, // Filter out deleted products initially
        {
          $lookup: {
            from: "categories",
            localField: "category_id",
            foreignField: "_id",
            as: "categoryDetails",
          },
        },
        {
          $lookup: {
            from: "inventories",
            localField: "_id",
            foreignField: "product_id",
            as: "inventoryDetails",
          },
        },
        {
          $addFields: {
            inventoryQuantity: {
              $ifNull: [{ $arrayElemAt: ["$inventoryDetails.quantity", 0] }, 0],
            },
            categoryName: {
              $ifNull: [{ $arrayElemAt: ["$categoryDetails.name", 0] }, ""],
            },
          },
        },
        // Apply search conditions after lookups
        ...(searchKeyword
          ? [
              {
                $match: {
                  $or: [
                    ...(isNaN(searchKeyword)
                      ? [
                          { name: { $regex: searchKeyword, $options: "i" } },
                          {
                            description: {
                              $regex: searchKeyword,
                              $options: "i",
                            },
                          },
                          {
                            categoryName: {
                              $regex: searchKeyword,
                              $options: "i",
                            },
                          },
                          {
                            $expr: {
                              $gt: [
                                {
                                  $size: {
                                    $filter: {
                                      input: { $objectToArray: "$features" },
                                      as: "feature",
                                      cond: {
                                        $or: [
                                          {
                                            $regexMatch: {
                                              input: "$$feature.k",
                                              regex: searchKeyword,
                                              options: "i",
                                            },
                                          },
                                          {
                                            $regexMatch: {
                                              input: "$$feature.v",
                                              regex: searchKeyword,
                                              options: "i",
                                            },
                                          },
                                        ],
                                      },
                                    },
                                  },
                                },
                                0,
                              ],
                            },
                          },
                        ]
                      : [
                          { unit_cost: Number(searchKeyword) },
                          { inventoryQuantity: Number(searchKeyword) },
                        ]),
                  ],
                },
              },
            ]
          : []),
        {
          $project: {
            inventoryDetails: 0,
            categoryDetails: 0,
          },
        },
        { $count: "totalCount" }, // This should come **after all search conditions**
      ]),
    ]);

    const totalCount =
      totalCountResult.length > 0 ? totalCountResult[0].totalCount : 0;

    return {
      success: true,
      data: {
        products: productsWithInventory,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalItems: totalCount,
          itemsPerPage: limit,
        },
      },
      statusCode: 200,
    };
  } catch (error) {
    console.error("getAllProducts error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};

export const getAllProductsWithoutPagination = async () => {
  try {
    const products = await Product.find({ isDeleted: false }, { name: 1 });
    return {
      success: true,
      data: products,
      statusCode: 200,
    };
  } catch (error) {
    console.error("getAllProductsWithoutPagination error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};

export const getAllOutsourcedProductsWithoutPagination = async () => {
  try {
    const products = await OutsourcedProduct.find(
      { isDeleted: false },
      { product_name: 1 }
    );
    return {
      success: true,
      data: products,
      statusCode: 200,
    };
  } catch (error) {
    console.error("getAllOutsourcedProductsWithoutPagination error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};

export const getProductDetails = async (productId) => {
  try {
    // Validate if the product ID exists
    const product = await Product.findById(productId).populate("category_id");
    if (!product) {
      return {
        success: false,
        message: "Product not found",
        statusCode: 404,
      };
    }

    // Fetch the inventory record for the product
    const inventory = await Inventory.findOne({
      product_id: productId,
      isDeleted: false,
    });
    const quantity = inventory ? inventory.quantity : 0;

    // Convert Mongoose document to plain object and include features
    const productData = product.toObject();
    if (product.features instanceof Map) {
      productData.features = Object.fromEntries(product.features); // Convert Map to plain object
    }

    // Return product details with inventory quantity
    return {
      success: true,
      data: {
        ...productData, // Use the modified product data
        quantity, // Add quantity from inventory
      },
      statusCode: 200,
    };
  } catch (error) {
    console.error("Error in getProductDetails => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};
