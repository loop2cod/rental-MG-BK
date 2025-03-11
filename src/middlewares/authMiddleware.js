import jwt from "jsonwebtoken";

export const isAuthenticated = (req, res, next) => {
  try {
    // Get the access token from cookies
    const accessToken = req.cookies.access_token;

    if (!accessToken) {
      return res
        .status(401)
        .json({ success: false, message: "No access token provided" });
    }

    // Verify the access token
    const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
    req.user = decoded; // Attach the decoded user data to the request object
    next();
  } catch (error) {
    console.log("Authentication error => ", error);

    // Handle specific JWT errors
    if (error.name === "TokenExpiredError") {
      // Check if the refresh token is also expired
      const refreshToken = req.cookies.refresh_token;
      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: "Access token expired, and no refresh token provided",
        });
      }

      try {
        // Verify the refresh token
        jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        // If refresh token is valid, return a specific message to prompt the client to refresh the access token
        return res.status(401).json({
          success: false,
          message: "Access token expired, please refresh your token",
        });
      } catch (refreshError) {
        // If refresh token is also expired
        if (refreshError.name === "TokenExpiredError") {
          return res.status(401).json({
            success: false,
            message:
              "Both access and refresh tokens expired, please log in again",
            data: { tokenExpired: true },
          });
        } else {
          return res.status(401).json({
            success: false,
            message: "Invalid refresh token",
            data: { tokenExpired: true },
          });
        }
      }
    } else if (error.name === "JsonWebTokenError") {
      return res
        .status(401)
        .json({
          success: false,
          message: "Invalid access token",
          data: { tokenExpired: true },
        });
    } else {
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
};
