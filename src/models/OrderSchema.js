import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    booking_id: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    from_date: {
      type: Date,
      required: [true, 'from_date is required']
    },
    to_date: {
      type: Date,
      required: [true, 'to_date is required']
    },
    from_time: {
      type: String,
      required: [true, 'from_time is required']
    },
    to_time: {
      type: String,
      required: [true, 'to_time is required']
    },
    no_of_days: {
      type: Number,
      required: [true, 'no_of_days is required']
    },
    order_date: { type: Date, default: Date.now },
    total_amount: { type: Number, required: true },
    amount_paid: { type: Number, required: true },
    order_items: [
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
    dispatch_items: [
      {
        product_id: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        quantity: Number,
      },
    ],
    total_quantity: Number,
    status: {
      type: String,
      enum: ["Pending", "Success", "Returned"],
      default: "Pending",
    },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Order", OrderSchema);
