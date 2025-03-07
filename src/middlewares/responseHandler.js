import logger from '../utils/logger.js';

export const sendResponse = (res, statusCode, success, message, data = null) => {
    const response = { success, message };
    if (data) response.data = data;
    
    // Convert message to string if it's an object
    const logMessage = typeof message === 'object' ? JSON.stringify(message) : message;
    
    // Log the response based on success status
    if (!success) {
        logger.error(`Error Response: ${statusCode} - ${logMessage}`);
    } else {
        logger.info(`Success Response: ${statusCode} - ${logMessage}`);
    }
    
    return res.status(statusCode).json(response);
};
  