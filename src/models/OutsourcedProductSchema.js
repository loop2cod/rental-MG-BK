import mongoose from "mongoose";

const OutsourcedProductSchema = new mongoose.Schema(
  {
    supplier_id: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
    product_name: { type: String, required: true },
    unit_cost: { type: Number, required: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("OutsourcedProduct", OutsourcedProductSchema);
