import mongoose from "mongoose";

const BookingSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  from_date: Date,
  to_date: Date,
  from_time: String,
  to_time: String,
  booking_date: { type: Date, default: Date.now },
  booking_items: [
    {
      product_id: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      name: String,
      price: Number,
      quantity: Number,
      total_price: Number
    }
  ],
  total_quantity: Number,
  created_at: { type: Date, default: Date.now },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  updated_at: { type: Date, default: Date.now },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
});

export default mongoose.model("Booking", BookingSchema);
