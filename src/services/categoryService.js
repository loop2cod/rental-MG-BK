import Category from "../models/CategorySchema.js";

export const addCategory = async (categoryData) => {
  try {
    // Validate required fields
    if (!categoryData.name) {
      return {
        success: false,
        message: "Name is required",
        statusCode: 400
      };
    }

    const newCategory = new Category(categoryData);
    const savedCategory = await newCategory.save();
    
    return {
      success: true,
      data: savedCategory,
      statusCode: 201
    };
  } catch (error) {
    console.log("addCategory error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500
    };
  }
};
