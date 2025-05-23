import Booking from "../models/BookingSchema.js";
import Inventory from "../models/InventorySchema.js";
import User from "../models/UserSchema.js";
import mongoose from "mongoose";
import Payment from "../models/PaymentSchema.js";
import sendEmail from "../utils/sendMail.js";
import createNotification from "../utils/createNotification.js";

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
      {
        mobile: fields.user_phone,
        secondary_mobile: fields.user_secondary_mobile,
      },
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
        secondary_mobile: fields.user_secondary_mobile,
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

    let paymentState =
      fields?.amount_paid < fields.total_amount ? "partial" : "complete";

    const newPayment = new Payment({
      booking_id: newBooking._id,
      user_id,
      amount: fields.amount_paid,
      payment_method: fields.payment_method || "cash",
      payment_state: paymentState,
      status: "success",
      stage: "booking",
      createdBy: user_id,
      updatedBy: user_id,
    });
    await newPayment.save({ session });

    if (!newPayment) {
      await session.abortTransaction();
      return {
        success: false,
        message: "Payment creation failed",
        statusCode: 500,
      };
    }

    await session.commitTransaction();
    createNotification("Booking created successfully", "success");

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
      console.log("Sending email initiated");
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
        { address: { $regex: search, $options: "i" } },
        { booking_id: { $regex: search, $options: "i" } }
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
      .sort({ createdAt: -1 })
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

export const listBookingWithoutPagination = async () => {
  try {
    const bookings = await Booking.find({ isDeleted: false });
    if (!bookings) {
      return {
        success: false,
        message: "No bookings found",
        statusCode: 404,
      };
    }
    return {
      success: true,
      message: "Bookings retrieved successfully",
      statusCode: 200,
      data: bookings,
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
      "name mobile secondary_mobile proof_type proof_id"
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
    const bookingDetails = await Booking.aggregate([
      {
        $match: {
          _id: mongoose.Types.ObjectId.createFromHexString(id),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },

      {
        $lookup: {
          from: "inventories",
          localField: "booking_items.product_id",
          foreignField: "product_id",
          as: "inventoryDetails",
        },
      },

      // Remove the early unwind of outsourced_items - we'll handle it differently
      {
        $lookup: {
          from: "outsourcedproducts",
          localField: "outsourced_items.out_product_id",
          foreignField: "_id",
          as: "outsourcedDetails",
        },
      },
      {
        $lookup: {
          from: "suppliers",
          localField: "outsourcedDetails.supplier_id",
          foreignField: "_id",
          as: "supplierDetails",
        },
      },

      {
        $lookup: {
          from: "payments",
          localField: "_id",
          foreignField: "booking_id",
          as: "payment_history",
        },
      },
      {
        $addFields: {
          payment_history: {
            $sortArray: {
              input: "$payment_history",
              sortBy: { payment_date: -1 },
            },
          },
        },
      },

      {
        $project: {
          _id: 1,
          from_date: 1,
          to_date: 1,
          from_time: 1,
          to_time: 1,
          no_of_days: 1,
          address: 1,
          booking_date: 1,
          total_amount: 1,
          amount_paid: 1,
          discount: 1,
          sub_total: 1,
          total_quantity: 1,
          status: 1,
          isDeleted: 1,
          createdAt: 1,
          updatedAt: 1,

          user: {
            _id: "$user._id",
            name: "$user.name",
            mobile: "$user.mobile",
            secondary_mobile: "$user.secondary_mobile",
            proof_type: "$user.proof_type",
            proof_id: "$user.proof_id",
          },

          booking_items: {
            $map: {
              input: "$booking_items",
              as: "item",
              in: {
                $mergeObjects: [
                  {
                    product_id: "$$item.product_id",
                    name: "$$item.name",
                    price: "$$item.price",
                    quantity: "$$item.quantity",
                    total_price: "$$item.total_price",
                    _id: "$$item._id",
                    isDeleted: "$$item.isDeleted",
                    createdAt: "$$item.createdAt",
                    updatedAt: "$$item.updatedAt",
                    __v: "$$item.__v",
                  },
                  {
                    $arrayElemAt: [
                      {
                        $map: {
                          input: {
                            $filter: {
                              input: "$inventoryDetails",
                              as: "inv",
                              cond: {
                                $eq: ["$$inv.product_id", "$$item.product_id"],
                              },
                            },
                          },
                          as: "inv",
                          in: {
                            reserved_quantity: "$$inv.reserved_quantity",
                            available_quantity: "$$inv.available_quantity",
                          },
                        },
                      },
                      0,
                    ],
                  },
                ],
              },
            },
          },

          // Fixed outsourced_items handling
          outsourced_items: {
            $map: {
              input: "$outsourced_items",
              as: "outsourced",
              in: {
                $mergeObjects: [
                  "$$outsourced",
                  {
                    $let: {
                      vars: {
                        matchedOutsourced: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$outsourcedDetails",
                                as: "detail",
                                cond: {
                                  $eq: ["$$detail._id", "$$outsourced.out_product_id"]
                                }
                              }
                            },
                            0
                          ]
                        }
                      },
                      in: {
                        $let: {
                          vars: {
                            matchedSupplier: {
                              $arrayElemAt: [
                                {
                                  $filter: {
                                    input: "$supplierDetails",
                                    as: "supplier",
                                    cond: {
                                      $eq: ["$$supplier._id", "$$matchedOutsourced.supplier_id"]
                                    }
                                  }
                                },
                                0
                              ]
                            }
                          },
                          in: {
                            supplier_id: "$$matchedOutsourced.supplier_id",
                            supplier_name: "$$matchedSupplier.name",
                            supplier_mobile: "$$matchedSupplier.mobile"
                          }
                        }
                      }
                    }
                  }
                ]
              }
            }
          },

          payment_history: 1,
        },
      },
    ]);

    if (bookingDetails.length === 0) {
      return {
        success: false,
        message: "Booking not found",
        statusCode: 404,
      };
    }

    const booking = bookingDetails[0];

    return {
      success: true,
      message: "Booking details fetched successfully",
      data: booking,
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
    createNotification(
      `Booking ${updatedBooking?.booking_id} has been cancelled`,
      "success"
    );

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
