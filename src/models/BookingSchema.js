import mongoose from "mongoose";

const BookingSchema = new mongoose.Schema(
  {
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
        total_price: Number,
      },
    ],
    outsourced_items: [
      {
        out_product_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "OutsourcedProduct",
        },
        name: String,
        price: Number,
        quantity: Number,
        total_price: Number,
      },
    ],
    status: {
      type: String,
      enum: ["Pending", "Success", "Cancelled"],
      default: "Pending",
    },
    total_quantity: Number,
    amount_paid: Number,
    discount: Number,
    total_amount: Number,
    remarks: String,
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Booking", BookingSchema);
