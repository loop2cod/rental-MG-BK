import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    type: String,
  },
  { timestamps: true }
);

const Notification = mongoose.model("Notification", NotificationSchema);

export default Notification;
