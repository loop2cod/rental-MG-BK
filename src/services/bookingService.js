import Booking from "../models/BookingSchema.js";
import User from "../models/UserSchema.js";
import { addBookingPayment } from "./paymentServices.js";

export const addBooking = async (fields, userId) => {
  try {
    let user_id;
    // Generate a default password using the current date and time
    const currentDate = new Date();
    const defaultPassword = `user${currentDate.getFullYear()}${String(
      currentDate.getMonth() + 1
    ).padStart(2, "0")}${String(currentDate.getDate()).padStart(
      2,
      "0"
    )}${String(currentDate.getHours()).padStart(2, "0")}${String(
      currentDate.getMinutes()
    ).padStart(2, "0")}`;

    const isUserExists = await User.findOne({ mobile: fields.user_phone });
    if (isUserExists) {
      user_id = isUserExists._id;
      if (isUserExists?.name !== fields.user_name) {
        // Update the user name
        await User.findByIdAndUpdate(user_id, {
          name: fields.user_name,
          updated_by: userId,
        });
      }
    } else {
      // Create the user first
      const newUser = new User({
        name: fields.user_name,
        mobile: fields.user_phone,
        user_role: "customer",
        proof_type: fields.user_proof_type,
        proof_id: fields.user_proof_id,
        password: defaultPassword,
        created_by: userId,
        updated_by: userId,
      });

      await newUser.save();

      user_id = newUser._id;
    }

    // Create the booking with the new user's ID
    const newBooking = new Booking({
      user_id: user_id,
      from_date: fields.from_date,
      to_date: fields.to_date,
      from_time: fields.from_time,
      to_time: fields.to_time,
      booking_date: fields.booking_date,
      booking_items: fields.booking_items,
      total_quantity: fields.total_quantity,
      amount_paid: fields.amount_paid,
      total_amount: fields.total_amount,
      created_by: userId,
      updated_by: userId,
    });

    await newBooking.save();

    const payment = await addBookingPayment(
      newBooking._id,
      fields.amount_paid,
      fields.total_amount,
      fields.payment_method,
      userId
    );

    if (!payment) {
      return {
        success: false,
        message: "Payment creation failed",
        statusCode: 500,
      };
    }

    return {
      success: true,
      message: "Booking created successfully",
      statusCode: 201,
      data: newBooking,
    };
  } catch (error) {
    console.error("addBooking error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};
