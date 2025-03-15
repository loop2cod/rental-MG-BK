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
    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return {
        success: false,
        message: "Product not found",
        statusCode: 404,
        data: null,
      };
    }

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
    const [productsWithInventory] = await Promise.all([
      Product.aggregate([
        { $match: baseMatchCondition }, // Only filter out deleted products initially
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
                      : [{ unit_cost: Number(searchKeyword) }]),
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
    ]);

    return {
      success: true,
      data: {
        products: productsWithInventory,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(productsWithInventory?.length / limit),
          totalItems: productsWithInventory?.length || 0,
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
