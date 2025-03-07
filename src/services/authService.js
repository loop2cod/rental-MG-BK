import User from "../models/UserSchema.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const loginUser = async (mobile, password) => {
  try {
    const user = await User.findOne({ mobile });
    if (!user) {
      return { success: false, message: "Invalid credentials" };
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return { success: false, message: "Invalid credentials" };
    }

    const token = jwt.sign({ userId: user._id, role: user.user_role }, process.env.JWT_SECRET, { expiresIn: "1d" });

    return { success: true, token, user: { id: user._id, name: user.name, role: user.user_role } };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const signupUser = async (mobile, password, name, user_role) => {
  try {
    const user = await User.findOne({ mobile });
    if (user) {
      return { success: false, message: "User already exists" };
    }

    const newUser = new User({ mobile, password, name, user_role });
    await newUser.save();

    const token = jwt.sign({ userId: newUser._id, role: newUser.user_role }, process.env.JWT_SECRET, { expiresIn: "1d" });

    return { success: true, token, user: { id: newUser._id, name: newUser.name, role: newUser.user_role } };
  } catch (error) {
    console.log("Error => ", error);
    return { success: false, message: error.message };
  }
};
