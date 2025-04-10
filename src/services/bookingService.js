import Booking from "../models/BookingSchema.js";
import Inventory from "../models/InventorySchema.js";
import User from "../models/UserSchema.js";
import mongoose from "mongoose";
import Payment from "../models/PaymentSchema.js";
import sendEmail from "../utils/sendMail.js";

export const addBooking = async (fields, userId) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    let user_id;
    const currentDate = new Date();
    const defaultPassword = `user${currentDate.getFullYear()}${String(
      currentDate.getMonth() + 1
    ).padStart(2, "0")}${String(currentDate.getDate()).padStart(
      2,
      "0"
    )}${String(currentDate.getHours()).padStart(2, "0")}${String(
      currentDate.getMinutes()
    ).padStart(2, "0")}`;

    // Find or Create User within transaction
    const isUserExists = await User.findOne(
      { mobile: fields.user_phone },
      null,
      { session }
    );

    if (isUserExists) {
      user_id = isUserExists._id;
      if (isUserExists?.name !== fields.user_name) {
        await User.findByIdAndUpdate(
          user_id,
          { name: fields.user_name, updated_by: userId },
          { session }
        );
      }
    } else {
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

      await newUser.save({ session });
      user_id = newUser._id;
    }

    const mergedItems = {};
    fields.booking_items.forEach((item) => {
      if (mergedItems[item.product_id]) {
        mergedItems[item.product_id].quantity += item.quantity;
        mergedItems[item.product_id].total_price += item.total_price;
      } else {
        mergedItems[item.product_id] = { ...item };
      }
    });
    fields.booking_items = Object.values(mergedItems);

    const mergedOutsourcedItems = {};
    fields.outsourced_items?.forEach((item) => {
      if (mergedOutsourcedItems[item.out_product_id]) {
        mergedOutsourcedItems[item.out_product_id].quantity += item.quantity;
        mergedOutsourcedItems[item.out_product_id].total_price +=
          item.total_price;
      } else {
        mergedOutsourcedItems[item.out_product_id] = { ...item };
      }
    });
    fields.outsourced_items = Object.values(mergedOutsourcedItems);

    const newBooking = new Booking({
      user_id: user_id,
      from_date: fields.from_date,
      address: fields.address,
      to_date: fields.to_date,
      from_time: fields.from_time,
      to_time: fields.to_time,
      no_of_days: fields.no_of_days,
      booking_date: fields.booking_date,
      booking_items: fields.booking_items,
      outsourced_items: fields.outsourced_items,
      total_quantity: fields.total_quantity,
      amount_paid: fields.amount_paid,
      sub_total: fields.sub_total,
      discount: fields.discount,
      total_amount: fields.total_amount,
      created_by: userId,
      updated_by: userId,
    });

    await newBooking.save({ session });
    await session.commitTransaction();

    // **SEND CONFIRMATION EMAIL**
    const emailSubject = "Booking Confirmation";
    const emailBody = `
      <h2>Booking Confirmation</h2>
      <p>Dear ${fields.user_name},</p>
      <p>Thank you for your booking. Your booking details are as follows:</p>
      <ul>
        <li><strong>Booking ID:</strong> ${newBooking._id}</li>
        <li><strong>From Date:</strong> ${fields.from_date}</li>
        <li><strong>To Date:</strong> ${fields.to_date}</li>
        <li><strong>Total Amount:</strong> ${fields.total_amount}</li>
      </ul>
      <p>We look forward to serving you!</p>
    `;

    setImmediate(() => {
      sendEmail(
        [process.env.ADMIN_EMAIL, process.env.ADMIN_EMAIL2],
        emailSubject,
        emailBody
      );
    });

    return {
      success: true,
      message: "Booking created successfully",
      data: { booking: newBooking },
      statusCode: 201,
    };
  } catch (error) {
    await session.abortTransaction();
    console.error("addBooking error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  } finally {
    session.endSession();
  }
};

export const updateBooking = async (id, data, fields, userId) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Retrieve the current booking within the transaction
    const currentBooking = await Booking.findById(id).session(session);
    if (!currentBooking || currentBooking.isDeleted) {
      await session.abortTransaction();
      return {
        success: false,
        message: "Booking not found or has been deleted",
        statusCode: 404,
      };
    }

    // Calculate the new potential amount paid
    const newAmountPaid =
      (currentBooking.amount_paid || 0) + (data.amount_paid || 0);

    // Check if the new amount paid exceeds the total amount
    if (newAmountPaid > currentBooking.total_amount) {
      await session.abortTransaction();
      return {
        success: false,
        message: "Amount exceeds the total amount payable",
        statusCode: 400,
      };
    }

    // Merge booking items
    const mergedBookingItems = {};
    data.booking_items?.forEach((item) => {
      if (mergedBookingItems[item.product_id]) {
        mergedBookingItems[item.product_id].quantity += item.quantity;
        mergedBookingItems[item.product_id].total_price += item.total_price;
      } else {
        mergedBookingItems[item.product_id] = { ...item };
      }
    });
    data.booking_items = Object.values(mergedBookingItems);

    // Preprocess outsourced_items to merge duplicates
    const mergedOutsourcedItems = {};
    data.outsourced_items?.forEach((item) => {
      if (mergedOutsourcedItems[item.out_product_id]) {
        mergedOutsourcedItems[item.out_product_id].quantity += item.quantity;
        mergedOutsourcedItems[item.out_product_id].total_price +=
          item.total_price;
      } else {
        mergedOutsourcedItems[item.out_product_id] = { ...item };
      }
    });
    data.outsourced_items = Object.values(mergedOutsourcedItems);

    const isUserExists = await User.findOne(
      { _id: currentBooking?.user_id },
      null,
      { session }
    );
    if (!isUserExists) {
      await session.abortTransaction();
      return {
        success: false,
        message: "User not found",
        statusCode: 404,
      };
    }

    if (
      isUserExists?.name !== data.user_name ||
      isUserExists?.proof_type !== data.user_proof_type ||
      isUserExists?.proof_id !== data.user_proof_id
    ) {
      // Update the user name
      await User.findByIdAndUpdate(
        { _id: isUserExists._id },
        {
          name: data.user_name,
          proof_type: data.user_proof_type,
          proof_id: data.user_proof_id,
          updated_by: userId,
        },
        { session }
      );
    }

    data.amount_paid = currentBooking?.amount_paid;

    // Proceed with the update if the validation passes
    const updatedBooking = await Booking.findOneAndUpdate({ _id: id }, data, {
      new: true,
      session,
    });

    await session.commitTransaction();
    return {
      success: true,
      message: "Booking updated successfully",
      data: updatedBooking,
      statusCode: 200,
    };
  } catch (error) {
    await session.abortTransaction();
    console.error("updateBooking error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  } finally {
    session.endSession();
  }
};

export const listBookings = async (
  page = 1,
  limit = 10,
  search = "",
  type = "all",
  status = "Pending"
) => {
  try {
    const skip = (page - 1) * limit;
    const searchQuery = { $or: [], status: status };

    // Apply expired filter
    if (type === "expired") {
      const currentDate = new Date();
      searchQuery.$or = searchQuery.$or || []; // Ensure $or exists
      searchQuery.$or.push({ to_date: { $lt: currentDate } });
    }

    if (search) {
      // Search in string fields
      searchQuery.$or.push(
        { "booking_items.name": { $regex: search, $options: "i" } },
        { "outsourced_items.name": { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } }
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

    // Ensure $or has at least one condition or remove it
    if (searchQuery.$or.length === 0) {
      delete searchQuery.$or;
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

export const bookingView = async (id) => {
  try {
    const booking = await Booking.findById(id).populate(
      "user_id",
      "name mobile proof_type proof_id"
    );
    if (!booking) {
      return {
        success: false,
        message: "Booking not found",
        statusCode: 404,
      };
    }

    return {
      success: true,
      message: "Booking fetched successfully",
      data: booking,
      statusCode: 200,
    };
  } catch (error) {
    console.error("bookingView error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};

export const bookingDetailsById = async (id) => {
  try {
    const booking = await Booking.findById(id).populate("user_id");
    if (!booking) {
      return {
        success: false,
        message: "Booking not found",
        statusCode: 404,
      };
    }

    // Map through booking items and attach inventory details
    const bookingItemsWithInventory = await Promise.all(
      booking.booking_items.map(async (item) => {
        const inventory = await Inventory.findOne(
          {
            product_id: item.product_id,
          },
          { quantity: 1, reserved_quantity: 1, available_quantity: 1, _id: 0 }
        );
        // Return the booking item with its inventory details
        return {
          ...item.toObject(),
          reserved_quantity: inventory.reserved_quantity,
          available_quantity: inventory.available_quantity,
        };
      })
    );

    // Return the booking with updated booking items
    return {
      success: true,
      message: "Booking details fetched successfully",
      data: {
        ...booking.toObject(),
        booking_items: bookingItemsWithInventory, // Replace original booking_items with the enhanced version
      },
      statusCode: 200,
    };
  } catch (error) {
    console.error("bookingViewById error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};

export const cancelBooking = async (id, remarks) => {
  try {
    const booking = await Booking.findById(id);
    if (!booking) {
      return {
        success: false,
        message: "Booking not found",
        statusCode: 404,
      };
    }

    // Check if the booking is already cancelled
    if (booking?.status === "Cancelled") {
      return {
        success: false,
        message: "Booking is already cancelled",
        statusCode: 400,
      };
    }

    // Update the booking status to cancelled
    const updatedBooking = await Booking?.findByIdAndUpdate(
      id,
      {
        status: "Cancelled",
        remarks: remarks,
        updated_by: booking.user_id,
      },
      { new: true }
    );

    if (!updatedBooking) {
      return {
        success: false,
        message: "Booking not found",
        statusCode: 404,
      };
    }

    return {
      success: true,
      message: "Booking cancelled successfully",
      data: updatedBooking,
      statusCode: 200,
    };
  } catch (error) {
    console.error("cancelBooking error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};
