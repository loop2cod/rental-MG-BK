import mongoose from "mongoose";

const ReturnSchema = new mongoose.Schema({
  booking_id: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
  return_items: [
    {
      product_id: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      product_name: String,
      price: Number,
      quantity: Number
    }
  ],
  remark: String,
  status: { type: String, enum: ["Returned", "Pending"], default: "Pending" },
  created_at: { type: Date, default: Date.now },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  updated_at: { type: Date, default: Date.now },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
});

export default mongoose.model("Return", ReturnSchema);
