import User from "../models/UserSchema.js";
import bcrypt from "bcrypt";

export const createStaffUser = async (name, mobile, password, user_role, createdBy) => {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ mobile });
    if (existingUser) {
      return {
        success: false,
        message: "User with this mobile number already exists",
        statusCode: 409,
      };
    }

    // Create new staff user
    const newUser = new User({
      name,
      mobile,
      password,
      user_role,
      created_by: createdBy,
    });

    await newUser.save();

    return {
      success: true,
      message: "Staff user created successfully",
      statusCode: 201,
      data: {
        user: {
          id: newUser._id,
          name: newUser.name,
          mobile: newUser.mobile,
          user_role: newUser.user_role,
        }
      }
    };
  } catch (error) {
    console.log("createStaffUser error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};

export const getStaffUsers = async () => {
  try {
    const staffUsers = await User.find(
      { 
        user_role: { $in: ["staff", "admin"] },
        isDeleted: { $ne: true }
      },
      { password: 0 } // Exclude password from results
    ).sort({ createdAt: -1 });

    return {
      success: true,
      message: "Staff users retrieved successfully",
      statusCode: 200,
      data: {
        users: staffUsers.map(user => ({
          _id: user._id,
          name: user.name,
          mobile: user.mobile,
          user_role: user.user_role,
          created_at: user.createdAt,
        }))
      }
    };
  } catch (error) {
    console.log("getStaffUsers error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};

export const deleteStaffUser = async (userId) => {
  try {
    const user = await User.findById(userId);
    
    if (!user) {
      return {
        success: false,
        message: "User not found",
        statusCode: 404,
      };
    }

    if (user.user_role === "admin") {
      return {
        success: false,
        message: "Cannot delete admin user",
        statusCode: 403,
      };
    }

    // Soft delete by setting isDeleted to true
    await User.findByIdAndUpdate(userId, { isDeleted: true });

    return {
      success: true,
      message: "Staff user deleted successfully",
      statusCode: 200,
    };
  } catch (error) {
    console.log("deleteStaffUser error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};

export const resetStaffPassword = async (userId, newPassword) => {
  try {
    const user = await User.findById(userId);
    
    if (!user) {
      return {
        success: false,
        message: "User not found",
        statusCode: 404,
      };
    }

    if (user.user_role === "customer") {
      return {
        success: false,
        message: "Cannot reset password for customer users",
        statusCode: 403,
      };
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password
    await User.findByIdAndUpdate(userId, { password: hashedPassword });

    return {
      success: true,
      message: "Password reset successfully",
      statusCode: 200,
    };
  } catch (error) {
    console.log("resetStaffPassword error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};