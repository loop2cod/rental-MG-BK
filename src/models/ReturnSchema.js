import mongoose from "mongoose";

const ReturnSchema = new mongoose.Schema(
  {
    booking_id: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    return_items: [
      {
        product_id: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        product_name: String,
        price: Number,
        quantity: Number,
      },
    ],
    remark: String,
    isDeleted: { type: Boolean, default: false },
    status: { type: String, enum: ["Returned", "Pending"], default: "Pending" },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Return", ReturnSchema);
