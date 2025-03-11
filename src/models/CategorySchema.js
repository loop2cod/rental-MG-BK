import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema(
  {
    name: String,
    description: String,
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Category", CategorySchema);
