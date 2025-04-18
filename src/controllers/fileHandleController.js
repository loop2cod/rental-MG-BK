import { sendResponse } from "../middlewares/responseHandler.js";
import { generatePresignedUrl } from "../services/fileHandleService.js";

export const generatePresignedUrlController = async (req, res) => {
  try {
    const { fileName, fileType } = req.query;

    const response = await generatePresignedUrl(fileName, fileType);

    sendResponse(
      res,
      response.statusCode,
      response.success,
      response.message,
      response.data
    );
  } catch (error) {
    console.log("generatePresignedUrlController error => ", error);
    sendResponse(res, 500, false, "Internal server error");
  }
};
