import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export const generatePresignedUrl = async (fileName, fileType) => {
  try {
    if (!fileName || !fileType) {
      return {
        success: false,
        message: "Missing fileName or fileType",
        statusCode: 400,
      };
    }

    const key = `uploads/${Date.now()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      ContentType: fileType,
    });

    const uploadURL = await getSignedUrl(s3Client, command, {
      expiresIn: 120,
    });

    const publicURL = `${process.env.R2_PUBLIC_HOST}/${key}`;
    
    return {
      success: true,
      message: "Presigned URL generated successfully",
      statusCode: 200,
      data: {
        uploadURL,
        publicURL,
      },
    };
  } catch (error) {
    console.error("generatePresignedUrl error =>", error);

    return {
      success: false,
      message: "Something went wrong generating the presigned URL",
      statusCode: 500,
    };
  }
};

export const deleteFile = async (fileUrl) => {
  try {
    if (!fileUrl) {
      return {
        success: false,
        message: "File URL is required",
        statusCode: 400,
      };
    }

    // Extract the key by removing the R2_PUBLIC_HOST prefix
    const key = fileUrl.replace(process.env.R2_PUBLIC_HOST + '/', '');
    console.log("Deleting file with key:", key);

    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);

    return {
      success: true,
      message: "File deleted successfully",
      statusCode: 200,
    };
  } catch (error) {
    console.error("deleteFile error =>", error.name, error.message);
    return {
      success: false,
      message: `Failed to delete file: ${error.message}`,
      statusCode: error.$metadata?.httpStatusCode || 500,
    };
  }
};
