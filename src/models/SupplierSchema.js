import mongoose from "mongoose";

const SupplierSchema = new mongoose.Schema(
  {
    name: String,
    contact: String,
    address: String,
    status: { type: String, enum: ["Returned", "Pending"], default: "Pending" },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.model("Supplier", SupplierSchema);
