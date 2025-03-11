import mongoose from "mongoose";

const OutsourcedProductSchema = new mongoose.Schema(
  {
    supplier_id: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
    product_name: String,
    unit_cost: Number,
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("OutsourcedProduct", OutsourcedProductSchema);
