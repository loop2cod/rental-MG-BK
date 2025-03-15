import Category from "../models/CategorySchema.js";

export const addCategory = async (categoryData) => {
  try {
    // Validate required fields
    if (!categoryData.name) {
      return {
        success: false,
        message: "Name is required",
        statusCode: 400,
      };
    }

    // Check if category name already exists
    const existingCategory = await Category.findOne({
      name: categoryData.name,
    });
    if (existingCategory) {
      return {
        success: false,
        message: "Category name already exists",
        statusCode: 409,
      };
    }

    const newCategory = new Category(categoryData);
    const savedCategory = await newCategory.save();

    return {
      success: true,
      data: savedCategory,
      statusCode: 201,
    };
  } catch (error) {
    console.log("addCategory error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};

export const listCategories = async () => {
  try {
    const categories = await Category.find({});
    return {
      success: true,
      data: categories,
      statusCode: 200,
    };
  } catch (error) {
    console.log("listCategories error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};

export const updateCategory = async (categoryData) => {
  try {
    // Validate required fields
    if (!categoryData.name) {
      return {
        success: false,
        message: "Name is required",
        statusCode: 400,
      };
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      categoryData._id,
      {
        name: categoryData.name,
        description: categoryData.description,
      },
      { new: true }
    );

    if (!updatedCategory) {
      return {
        success: false,
        message: "Category not found",
        statusCode: 404,
        data: null,
      };
    }

    return {
      success: true,
      data: updatedCategory,
      statusCode: 200,
    };
  } catch (error) {
    console.log("updateCategory error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};

export const deleteCategory = async (categoryId) => {
  try {
    const isAlreadyDeleted = await Category.findById(categoryId);
    if (isAlreadyDeleted?.isDeleted) {
      return {
        success: false,
        message: "Category is already deleted",
        statusCode: 400,
      };
    }

    const category = await Category.findByIdAndUpdate(categoryId, {
      isDeleted: true,
    });

    if (!category) {
      return {
        success: false,
        message: "Category not found",
        statusCode: 404,
        data: null,
      };
    }

    return {
      success: true,
      message: "Category deleted",
      statusCode: 200,
    };
  } catch (error) {
    console.log("deleteCategory error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};
