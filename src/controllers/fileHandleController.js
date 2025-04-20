import { sendResponse } from "../middlewares/responseHandler.js";
import { deleteFile, generatePresignedUrl } from "../services/fileHandleService.js";

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

export const deleteFileController = async (req, res) => {
  try {
    const { fileUrl } = req.body;

    const response = await deleteFile(fileUrl);

    sendResponse(
      res,
      response.statusCode,
      response.success,
      response.message,
      response.data
    );
  } catch (error) {
    console.log("deleteFileController error => ", error);
    sendResponse(res, 500, false, "Internal server error");
  }
};