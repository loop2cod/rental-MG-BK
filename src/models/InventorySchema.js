import mongoose from "mongoose";

const InventorySchema = new mongoose.Schema(
  {
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    quantity: { type: Number, required: true },
    reserved_quantity: { type: Number, default: 0 },
    available_quantity: { type: Number, default: 0 },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

InventorySchema.index({ quantity: 1 });

export default mongoose.model("Inventory", InventorySchema);
