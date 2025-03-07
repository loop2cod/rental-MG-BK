import mongoose from "mongoose";

const SupplierSchema = new mongoose.Schema({
  name: String,
  contact: String,
  address: String,
  status: { type: String, enum: ["Returned", "Pending"], default: "Pending" },
  created_at: { type: Date, default: Date.now },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  updated_at: { type: Date, default: Date.now },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
});

export default mongoose.model("Supplier", SupplierSchema);
