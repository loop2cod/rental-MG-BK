import mongoose from "mongoose";

const PurchaseItemSchema = new mongoose.Schema({
  product_name: {
    type: String,
    required: true,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  unit_price: {
    type: Number,
    required: true,
    min: 0,
  },
  total_price: {
    type: Number,
    required: true,
    min: 0,
  },
});

const PurchaseSchema = new mongoose.Schema({
  supplier_name: {
    type: String,
    required: true,
    trim: true,
  },
  supplier_contact: {
    type: String,
    trim: true,
  },
  purchase_date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  invoice_number: {
    type: String,
    trim: true,
  },
  items: [PurchaseItemSchema],
  total_amount: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ["pending", "received", "cancelled"],
    default: "pending",
  },
  notes: {
    type: String,
    trim: true,
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

export default mongoose.model("Purchase", PurchaseSchema);