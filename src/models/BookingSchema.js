import mongoose from "mongoose";
import { v4 as uuidv4 } from 'uuid';

const BookingSchema = new mongoose.Schema(
  {
    booking_id: { 
      type: String,
      unique: true,
      default: () => `BKG-${uuidv4().substring(0, 8).toUpperCase()}`
    },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    address: { type: String, required: true },
    from_date: {
      type: Date,
      required: [true, "from_date is required"],
    },
    to_date: {
      type: Date,
      required: [true, "to_date is required"],
    },
    from_time: {
      type: String,
      required: [true, "from_time is required"],
    },
    to_time: {
      type: String,
      required: [true, "to_time is required"],
    },
    no_of_days: {
      type: Number,
      required: [true, "no_of_days is required"],
    },
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
    discount: { type: Number, default: 0 },
    sub_total: Number,
    total_amount: Number,
    remarks: String,
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Pre-save hook to ensure unique booking_id
BookingSchema.pre('save', function(next) {
  if (!this.booking_id) {
    this.booking_id = `BKG-${uuidv4().substring(0, 8).toUpperCase()}`;
  }
  next();
});

export default mongoose.model("Booking", BookingSchema);
