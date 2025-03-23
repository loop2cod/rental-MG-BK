import Supplier from "../models/SupplierSchema.js";
import OutsourcedProduct from "../models/OutsourcedProductSchema.js";

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

export const getAllSuppliersWithoutPagination = async () => {
  try {
    const suppliers = await Supplier.find({ isDeleted: false }, { name: 1 });
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
    const searchQuery = { isDeleted: false };

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
