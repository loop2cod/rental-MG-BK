import AWS from "aws-sdk";

export const generatePresignedUrl = async (fileName, fileType) => {
  // Configure AWS SDK for Cloudflare R2
  const s3 = new AWS.S3({
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    endpoint: process.env.R2_ENDPOINT,
    region: "auto",
    signatureVersion: "v4",
  });

  try {
    if (!fileName || !fileType) {
      return {
        success: false,
        message: "Missing fileName or fileType",
        statusCode: 400,
      };
    }

    const key = `uploads/${Date.now()}-${fileName}`;

    const uploadURL = await s3.getSignedUrlPromise("putObject", {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Expires: 60,
      ContentType: fileType,
      ACL: "public-read",
    });

    const publicURL = `https://${process.env.R2_BUCKET_NAME}.${process.env.R2_PUBLIC_HOST}/${key}`;

    return {
      success: true,
      message: "Presigned URL generated successfully",
      statusCode: 200,
      uploadURL,
      publicURL,
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
