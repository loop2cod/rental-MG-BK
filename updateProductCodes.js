import dotenv from "dotenv";
import mongoose from "mongoose";
import { updateExistingProductsWithCodes } from "./src/utils/updateProductCodes.js";

dotenv.config();

const runUpdate = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB successfully");
    
    const result = await updateExistingProductsWithCodes();
    
    if (result.success) {
      console.log("✅", result.message);
      console.log("📊 Products updated:", result.updated);
    } else {
      console.log("❌", result.message);
      if (result.error) console.log("Error:", result.error);
    }
    
  } catch (error) {
    console.error("❌ Script execution error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("MongoDB connection closed");
    process.exit(0);
  }
};

runUpdate();