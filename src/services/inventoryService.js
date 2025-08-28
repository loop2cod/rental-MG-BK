import Product from "../models/ProductSchema.js";
import Inventory from "../models/InventorySchema.js";
import OutsourcedProduct from "../models/OutsourcedProductSchema.js";
import Category from "../models/CategorySchema.js";
import createNotification from "../utils/createNotification.js";
import { generateProductCode } from "../utils/updateProductCodes.js";

export const addProductToInventory = async (fields, userId) => {
  try {
    const existingProduct = await Product.findOne({ name: fields.name });
    if (existingProduct) {
      return {
        success: false,
        message: "Product already exists",
        statusCode: 409,
      };
    }

    // Generate product code
    const productCode = await generateProductCode();

    // Create the product in the Product collection
    const newProduct = new Product({
      code: productCode,
      name: fields.name,
      description: fields.description,
      unit_cost: fields.unit_cost,
      features: fields.features || "{}",
      images: fields.images || [],
      category_id: fields.category_id,
      created_by: userId,
      updated_by: userId,
    });
    await newProduct.save();

    // Add the product to the Inventory collection
    const newInventoryItem = new Inventory({
      product_id: newProduct._id,
      quantity: fields.quantity || 0,
      available_quantity: fields.quantity || 0,
      reserved_quantity: 0,
      created_by: userId,
      updated_by: userId,
    });
    await newInventoryItem.save();
    createNotification("Product added to inventory", "success");

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

export const addOutsourcedProduct = async (fields, userId) => {
  try {
    const existingProduct = await OutsourcedProduct.findOne({
      product_name: fields.product_name,
      supplier_id: fields.supplier_id,
    });
    if (existingProduct) {
      return {
        success: false,
        message: "Product already exists",
        statusCode: 409,
      };
    }

    // Create the outsourced product
    const newProduct = new OutsourcedProduct({
      supplier_id: fields.supplier_id,
      product_name: fields.product_name,
      unit_cost: fields.unit_cost,
      purchase_rate: fields.purchase_rate,
      created_by: userId,
      updated_by: userId,
    });

    await newProduct.save();
    createNotification("Outsourced product added", "success");

    return {
      success: true,
      message: "Outsourced product created successfully",
      data: newProduct,
      statusCode: 201,
    };
  } catch (error) {
    console.error("addOutsourcedProduct error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};

export const updateProductOfInventory = async (productId, fields) => {
  console.log("Fields to update: ", fields);

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
        features: fields.features || "{}",
        images: fields.images || [],
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

    const [productsWithInventory, totalCountResult] = await Promise.all([
      Product.aggregate([
        { $match: baseMatchCondition },
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
            available_quantity: {
              $ifNull: [{ $arrayElemAt: ["$inventoryDetails.available_quantity", 0] }, 0],
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
                          { code: { $regex: searchKeyword, $options: "i" } },
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
                          {
                            $expr: {
                              $regexMatch: {
                                input: { $toString: "$unit_cost" },
                                regex: searchKeyword,
                                options: "i",
                              },
                            },
                          },
                          {
                            $expr: {
                              $regexMatch: {
                                input: { $toString: "$inventoryQuantity" },
                                regex: searchKeyword,
                                options: "i",
                              },
                            },
                          },
                          {
                            $expr: {
                              $regexMatch: {
                                input: {
                                  $toString: {
                                    $arrayElemAt: [
                                      "$inventoryDetails.quantity",
                                      0,
                                    ],
                                  },
                                },
                                regex: searchKeyword,
                                options: "i",
                              },
                            },
                          },
                          {
                            $expr: {
                              $regexMatch: {
                                input: {
                                  $toString: {
                                    $arrayElemAt: [
                                      "$inventoryDetails.reserved_quantity",
                                      0,
                                    ],
                                  },
                                },
                                regex: searchKeyword,
                                options: "i",
                              },
                            },
                          },
                          {
                            $expr: {
                              $regexMatch: {
                                input: {
                                  $toString: {
                                    $arrayElemAt: [
                                      "$inventoryDetails.available_quantity",
                                      0,
                                    ],
                                  },
                                },
                                regex: searchKeyword,
                                options: "i",
                              },
                            },
                          },
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
        { $sort: { createdAt: -1 } },
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
            available_quantity: {
              $ifNull: [{ $arrayElemAt: ["$inventoryDetails.available_quantity", 0] }, 0],
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
                          { code: { $regex: searchKeyword, $options: "i" } },
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
                          {
                            $expr: {
                              $regexMatch: {
                                input: { $toString: "$unit_cost" },
                                regex: searchKeyword,
                                options: "i",
                              },
                            },
                          },
                          {
                            $expr: {
                              $regexMatch: {
                                input: { $toString: "$inventoryQuantity" },
                                regex: searchKeyword,
                                options: "i",
                              },
                            },
                          },
                          {
                            $expr: {
                              $regexMatch: {
                                input: {
                                  $toString: {
                                    $arrayElemAt: [
                                      "$inventoryDetails.quantity",
                                      0,
                                    ],
                                  },
                                },
                                regex: searchKeyword,
                                options: "i",
                              },
                            },
                          },
                          {
                            $expr: {
                              $regexMatch: {
                                input: {
                                  $toString: {
                                    $arrayElemAt: [
                                      "$inventoryDetails.reserved_quantity",
                                      0,
                                    ],
                                  },
                                },
                                regex: searchKeyword,
                                options: "i",
                              },
                            },
                          },
                          {
                            $expr: {
                              $regexMatch: {
                                input: {
                                  $toString: {
                                    $arrayElemAt: [
                                      "$inventoryDetails.available_quantity",
                                      0,
                                    ],
                                  },
                                },
                                regex: searchKeyword,
                                options: "i",
                              },
                            },
                          },
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
    const products = await Product.aggregate([
      {
        $match: { isDeleted: false },
      },
      {
        $lookup: {
          from: "inventories",
          localField: "_id",
          foreignField: "product_id",
          as: "inventory",
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "category_id",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          description: 1,
          unit_cost: 1,
          features: 1,
          images: 1,
          category_id: 1,
          isDeleted: 1,
          createdAt: 1,
          updatedAt: 1,
          __v: 1,
          quantity: "$inventory.quantity",
          reserved_quantity: "$inventory.reserved_quantity",
          category: 1,
        },
      },
    ]);

    return {
      success: true,
      message: "Products fetched successfully",
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

export const getOutsourcedProductsBasedOnSupplier = async (supplier_id) => {
  try {
    const products = await OutsourcedProduct.find(
      {
        supplier_id,
        isDeleted: false,
      },
      {
        product_name: 1,
        unit_cost: 1,
        quantity: 1,
        isDeleted: 1,
      }
    );

    if (!products) {
      return {
        success: false,
        message: "No products found",
        statusCode: 404,
      };
    }

    return {
      success: true,
      data: products,
      statusCode: 200,
    };
  } catch (error) {
    console.error("Error in getOutsourcedProductsBasedOnSupplier => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};

export const getAllProductsWithAvailableQuantity = async () => {
  try {
    const products = await Product.aggregate([
      {
        $match: { isDeleted: false },
      },
      {
        $lookup: {
          from: "inventories",
          localField: "_id",
          foreignField: "product_id",
          as: "inventory",
        },
      },
      { $unwind: "$inventory" },
      {
        $lookup: {
          from: "categories",
          localField: "category_id",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      {
        $project: {
          _id: 1,
          name: 1,
          description: 1,
          unit_cost: 1,
          features: 1,
          images: 1,
          category: "$category.name",
          isDeleted: 1,
          quantity: "$inventory.quantity",
          reserved_quantity: "$inventory.reserved_quantity",
          available_quantity: "$inventory.available_quantity",
        },
      },
    ]);

    return {
      success: true,
      data: products,
      statusCode: 200,
    };
  } catch (error) {
    console.error("getAllProductsWithAvailableQuantity error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};
