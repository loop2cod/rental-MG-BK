import User from "../models/UserSchema.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const loginUser = async (mobile, password, res) => {
  try {
    const user = await User.findOne({ mobile });
    if (!user) {
      return {
        success: false,
        message: "User does not exist",
        statusCode: 404,
      };
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return {
        success: false,
        message: "Invalid credentials",
        statusCode: 409,
      };
    }

    // Check if user has admin or staff role
    if (user.user_role !== "admin" && user.user_role !== "staff") {
      return {
        success: false,
        message: "Access denied. Only admin and staff users can login.",
        statusCode: 403,
      };
    }

    // Generate access token (short-lived)
    const accessToken = jwt.sign(
      { userId: user._id, role: user.user_role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "15m" } // 15 minutes
    );

    // Generate refresh token (long-lived)
    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.REFRESH_EXPIRY }
    );

    // Set access token cookie
    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      // maxAge: 15 * 60 * 1000, // 15 minutes
    });

    // Set refresh token cookie
    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      // maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      success: true,
      user: { id: user._id, name: user.name, role: user.user_role },
      statusCode: 200,
    };
  } catch (error) {
    console.log("loginUser error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};

export const signupUser = async (
  mobile,
  secondary_mobile,
  password,
  name,
  user_role,
  res
) => {
  try {
    const user = await User.findOne({ mobile });
    if (user) {
      return {
        success: false,
        message: "User already exists",
        statusCode: 409,
      };
    }

    const newUser = new User({
      mobile,
      secondary_mobile,
      password,
      name,
      user_role,
    });
    await newUser.save();

    // Generate access token (short-lived)
    const accessToken = jwt.sign(
      { userId: newUser._id, role: newUser.user_role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "15m" } // 15 minutes
    );

    // Generate refresh token (long-lived)
    const refreshToken = jwt.sign(
      { userId: newUser._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" } // 7 days
    );

    // Set access token cookie
    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      // maxAge: 15 * 60 * 1000, // 15 minutes
    });

    // Set refresh token cookie
    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      // maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      success: true,
      user: {
        id: newUser._id,
        name: newUser.name,
        role: newUser.user_role,
      },
      statusCode: 201,
    };
  } catch (error) {
    console.log("Error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};

export const logoutUser = (res) => {
  try {
    res.clearCookie("access_token");
    res.clearCookie("refresh_token");
    return {
      success: true,
      message: "Logged out successfully",
      statusCode: 200,
    };
  } catch (error) {
    console.log("logoutUser error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};

// Add refresh token endpoint
export const getAuthToken = async (req, res) => {
  try {
    const accessToken = req.cookies.access_token;
    const refreshToken = req.cookies.refresh_token;

    // If no tokens are present
    if (!accessToken && !refreshToken) {
      return {
        success: false,
        message: "No tokens provided",
        sessionOut: true,
        statusCode: 401,
      };
    }

    // Try to verify access token
    try {
      const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
      const user = await User.findById(decoded?.userId);
      if (!user) {
        return { success: false, message: "User not found", statusCode: 404 };
      }
      return { success: true, statusCode: 200 };
    } catch (accessTokenError) {
      // If access token is expired, try to refresh it
      if (accessTokenError.name === "TokenExpiredError" && refreshToken) {
        try {
          const refreshDecoded = jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_SECRET
          );
          const user = await User.findById(refreshDecoded?.userId);

          if (!user) {
            return {
              success: false,
              message: "User not found",
              statusCode: 404,
            };
          }

          // Generate new access token
          const newAccessToken = jwt.sign(
            { userId: user._id, role: user.user_role },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: process.env.ACCESS_EXPIRY }
          );

          // Set new access token cookie
          res.cookie("access_token", newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
          });

          return {
            success: true,
            statusCode: 200,
            newAccessToken,
          };
        } catch (refreshTokenError) {
          console.log("Refresh token error => ", refreshTokenError);
          return {
            success: false,
            message: "Invalid refresh token",
            statusCode: 401,
          };
        }
      }
      console.log("Access token error => ", accessTokenError);
      return {
        success: false,
        message: "Invalid access token",
        statusCode: 401,
      };
    }
  } catch (error) {
    console.log("getAuthToken error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};

export const checkAuthenticated = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refresh_token;
    if (req.cookies === undefined || !refreshToken) {
      return {
        success: false,
        message: "No refresh token provided",
        statusCode: 400,
        sessionOut: true,
      };
    }

    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    return {
      success: true,
      message: "Refresh token is valid",
      statusCode: 200,
    };
  } catch (error) {
    console.log("getAuthToken error => ", error);

    if (error.name === "TokenExpiredError") {
      return {
        success: false,
        message: "Refresh token has expired",
        statusCode: 400,
      };
    } else if (error.name === "JsonWebTokenError") {
      return {
        success: false,
        message: "Invalid refresh token",
        statusCode: 400,
      };
    } else {
      return {
        success: false,
        message: "Internal server error",
        statusCode: 500,
      };
    }
  }
};

export const getUserData = async (req, res) => {
  try {
    const accessToken = req.cookies?.access_token;
    if (!accessToken) {
      return {
        success: false,
        message: "No access token provided",
        statusCode: 401,
      };
    }

    const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return {
        success: false,
        message: "User not found",
        statusCode: 404,
      };
    }

    return {
      success: true,
      message: "User data retrieved successfully",
      statusCode: 200,
      data: {
        user: {
          id: user._id,
          name: user.name,
          role: user.user_role,
          mobile: user.mobile,
        }
      }
    };
  } catch (error) {
    console.log("getUserData error => ", error);

    if (error.name === "TokenExpiredError") {
      return {
        success: false,
        message: "Access token expired",
        statusCode: 401,
      };
    } else if (error.name === "JsonWebTokenError") {
      return {
        success: false,
        message: "Invalid access token",
        statusCode: 401,
      };
    } else {
      return {
        success: false,
        message: "Internal server error",
        statusCode: 500,
      };
    }
  }
};
