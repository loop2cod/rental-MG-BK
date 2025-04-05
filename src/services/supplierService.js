import mongoose from "mongoose";
import Supplier from "../models/SupplierSchema.js";
import OutsourcedProduct from "../models/OutsourcedProductSchema.js";
import Order from "../models/OrderSchema.js";

export const createSupplier = async (fields, userId) => {
  try {
    // Check if supplier already exists
    const existingSupplier = await Supplier.findOne({ name: fields.name });
    if (existingSupplier) {
      return {
        success: false,
        message: "Supplier already exists",
        statusCode: 409,
      };
    }

    // Create new supplier
    const newSupplier = new Supplier({
      name: fields.name,
      contact: fields.contact,
      address: fields.address,
      status: fields.status,
      created_by: userId,
      updated_by: userId,
    });

    await newSupplier.save();

    return {
      success: true,
      message: "Supplier created successfully",
      statusCode: 201,
      data: newSupplier,
    };
  } catch (error) {
    console.error("createSupplier error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};

export const updateSupplier = async (supplierId, supplier) => {
  try {
    const supplierToUpdate = await Supplier.findById(supplierId);
    if (!supplierToUpdate) {
      return {
        success: false,
        message: "Supplier not found",
        statusCode: 404,
      };
    } else {
      const updatedSupplier = await Supplier.findByIdAndUpdate(
        supplierId,
        supplier,
        { new: true }
      );
      return {
        success: true,
        message: "Supplier updated",
        data: updatedSupplier,
        statusCode: 200,
      };
    }
  } catch (error) {
    console.error("updateSupplier error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};

export const getAllSuppliersWithoutPagination = async () => {
  try {
    const suppliers = await Supplier.find(
      { isDeleted: false, status: "Active" },
      { name: 1 }
    );
    return {
      success: true,
      data: suppliers,
      statusCode: 200,
    };
  } catch (error) {
    console.error("getAllSuppliersWithoutPagination error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};

export const getAllSuppliersWithPagination = async (
  page = 1,
  limit = 10,
  search = ""
) => {
  try {
    const skip = (page - 1) * limit;
    const searchQuery = { isDeleted: false, status: "Active" };

    if (search !== "") {
      searchQuery.$or = [
        { name: { $regex: search, $options: "i" } },
        { contact: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
        { status: { $regex: search, $options: "i" } },
      ];
    }

    const suppliers = await Supplier.find(searchQuery).skip(skip).limit(limit);

    const totalSuppliers = await Supplier.countDocuments(searchQuery);

    return {
      success: true,
      data: {
        suppliers,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalSuppliers / limit),
          totalItems: totalSuppliers,
          itemsPerPage: limit,
        },
      },
      statusCode: 200,
    };
  } catch (error) {
    console.error("getAllSuppliersWithPagination error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};


export const getSupplierOverview = async (supplierId) => {
  try {
    // Validate supplier existence
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return {
        success: false,
        message: "Supplier not found",
        statusCode: 404,
      };
    }

    const objectSupplierId = mongoose.Types.ObjectId.createFromHexString(supplierId);

    // 1. Aggregate outsourced products with their related orders
    const results = await OutsourcedProduct.aggregate([
      {
        $match: {
          supplier_id: objectSupplierId,
          isDeleted: false,
        },
      },
      {
        $lookup: {
          from: "orders",
          let: { outsourcedProductId: "$_id" },
          pipeline: [
            { $unwind: "$outsourced_items" },
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: [
                        "$outsourced_items.out_product_id",
                        "$$outsourcedProductId",
                      ],
                    },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
            {
              $project: {
                _id: 1,
                order_date: 1,
                total_amount: 1,
                status: 1,
                "outsourced_items.name": 1,
                "outsourced_items.quantity": 1,
                "outsourced_items.total_price": 1,
              },
            },
          ],
          as: "orders",
        },
      },
      {
        $project: {
          product_name: 1,
          unit_cost: 1,
          orders: 1,
        },
      },
    ]);

    // 2. Calculate total purchase amount and number
    const products = await OutsourcedProduct.find({
      supplier_id: objectSupplierId,
      isDeleted: false,
    }).select("_id");

    const productIds = products.map((p) => p._id);

    const totalStats = await Order.aggregate([
      { $match: { isDeleted: false } },
      { $unwind: "$outsourced_items" },
      {
        $match: {
          "outsourced_items.out_product_id": { $in: productIds },
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$outsourced_items.total_price" },
          totalQuantity: { $sum: "$outsourced_items.quantity" },
        },
      },
    ]);

    const { totalAmount = 0, totalQuantity = 0 } = totalStats[0] || {};

    return {
      success: true,
      data: {
        products: results,
        total_purchase_amount: totalAmount,
        total_purchase_quantity: totalQuantity,
      },
      statusCode: 200,
    };
  } catch (error) {
    console.error("Error fetching supplier overview:", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};
