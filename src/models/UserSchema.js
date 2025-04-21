import mongoose from "mongoose";
import bcrypt from "bcrypt";

const UserSchema = new mongoose.Schema(
  {
    name: String,
    mobile: { type: String, unique: true, required: true },
    secondary_mobile: { type: String, unique: true },
    user_role: {
      type: String,
      enum: ["admin", "customer"],
      required: true,
    },
    proof_type: {
      type: String,
      enum: ["votersId", "aadhar", "drivingLicense", "pancard"],
    },
    notifiers: [
      {
        name: {
          type: String,
          required: true,
        },
        phone: {
          type: String,
          validate: {
            validator: function (v) {
              // Either phone or email must be present
              return !!v || !!this.email;
            },
            message: "Either phone or email is required",
          },
        },
        email: {
          type: String,
          validate: {
            validator: function (v) {
              // Either phone or email must be present
              return !!v || !!this.phone;
            },
            message: "Either phone or email is required",
          },
        },
        method: {
          type: String,
          enum: ["email", "sms", "whatsapp"],
          required: true,
        },
      },
    ],
    proof_id: { type: String },
    password: { type: String, required: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Hash password before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
UserSchema.methods.comparePassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", UserSchema);
