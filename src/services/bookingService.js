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
      outsourced_items: fields.outsourced_items,
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

export const listBookings = async (
  page = 1,
  limit = 10,
  search = "",
  type = "all"
) => {
  try {
    const skip = (page - 1) * limit;
    const searchQuery = { $or: [] };

    // Apply expired filter
    if (type === "expired") {
      const currentDate = new Date();
      searchQuery.$or = searchQuery.$or || []; // Ensure $or exists
      searchQuery.$or.push({ to_date: { $lt: currentDate } });
    }

    if (search) {
      // Search in string fields
      searchQuery.$or.push(
        { "booking_items.name": { $regex: search, $options: "i" } } // Product name search
      );
      searchQuery.$or.push(
        { "outsourced_items.name": { $regex: search, $options: "i" } } // Product name search
      );

      // Search in numeric fields if search is a number
      if (!isNaN(search)) {
        searchQuery.$or.push(
          { total_quantity: Number(search) },
          { amount_paid: Number(search) },
          { total_amount: Number(search) }
        );
      }

      // Search in date fields if search is a valid date
      const searchDate = new Date(search);
      if (!isNaN(searchDate)) {
        const startOfDay = new Date(searchDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(searchDate);
        endOfDay.setHours(23, 59, 59, 999);

        searchQuery.$or.push(
          { from_date: { $gte: startOfDay, $lte: endOfDay } },
          { to_date: { $gte: startOfDay, $lte: endOfDay } },
          { booking_date: { $gte: startOfDay, $lte: endOfDay } }
        );
      }
    }

    // Fetch bookings with pagination
    const bookings = await Booking.find(searchQuery)
      .skip(skip)
      .limit(limit)
      .populate({
        path: "user_id",
        select: "name mobile",
      })
      .populate("created_by", "name")
      .populate("updated_by", "name");

    // Count total bookings matching the search query
    const totalBookings = await Booking.countDocuments(searchQuery);

    return {
      success: true,
      message: "Bookings fetched successfully",
      data: {
        bookings,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalBookings / limit),
          totalBookings,
          itemsPerPage: limit,
        },
      },
      statusCode: 200,
    };
  } catch (error) {
    console.error("listBookings error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};
