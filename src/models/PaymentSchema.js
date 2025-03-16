import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema(
  {
    booking_id: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    amount: { type: Number, required: true },
    payment_method: {
      type: String,
      enum: ["credit_card", "debit_card", "upi", "net_banking", "cash"],
      required: true,
    },
    transaction_id: { type: String },
    payment_state: {
      type: String,
      enum: ["partial", "complete"],
      default: "partial",
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed", "refunded"],
      default: "pending",
    },
    payment_date: { type: Date, default: Date.now },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Payment", PaymentSchema);
