import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    unit_cost: { type: Number, required: true },
    features: { type: Map, of: String }, // Dynamic key-value pairs
    images: [{ type: String }], // Array of image URLs or file paths
    category_id: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Product", ProductSchema);
