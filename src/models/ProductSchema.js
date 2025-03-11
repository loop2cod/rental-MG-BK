import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema({
  name: String,
  unit_cost: Number,
  features: { type: Map, of: String }, // Dynamic key-value pairs
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

export default mongoose.model("Product", ProductSchema);
