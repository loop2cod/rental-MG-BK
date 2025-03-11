import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  booking_id: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
  from_date: Date,
  to_date: Date,
  from_time: String,
  to_time: String,
  order_date: { type: Date, default: Date.now },
  order_amount: Number,
  order_items: [
    {
      product_id: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      name: String,
      price: Number,
      quantity: Number
    }
  ],
  dispatch_items: [
    {
      product_id: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      quantity: Number
    }
  ],
  total_quantity: Number,
  status: { type: String, enum: ["Returned", "Pending"], default: "Pending" },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

export default mongoose.model("Order", OrderSchema);
