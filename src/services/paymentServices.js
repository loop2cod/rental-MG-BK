import Payment from "../models/PaymentSchema.js";
import Refund from "../models/RefundSchema.js";
import Booking from "../models/BookingSchema.js";
import Order from "../models/OrderSchema.js";
import mongoose from "mongoose";

export const addPayment = async (body, user_id) => {
  const { booking_id, amount_paid, total_amount, payment_method, stage } = body;
  const session = await mongoose.startSession(); // Start a session
  try {
    session.startTransaction(); // Start a transaction
    const isBookingAvailable = await Booking.findOne(
      { _id: booking_id, isDeleted: false },
      null,
      { session }
    );

    if (!isBookingAvailable) {
      await session.abortTransaction();
      return {
        success: false,
        message: "Booking not found",
        statusCode: 404,
      };
    }

    if (stage === "order") {
      const totalAmountPaid =
        Number(isBookingAvailable?.amount_paid) + Number(amount_paid);

      const isOrderAvailable = await Order.findOne(
        { booking_id: booking_id, isDeleted: false },
        null,
        { session }
      );

      if (!isOrderAvailable) {
        await session.abortTransaction();
        return {
          success: false,
          message: "Order not found",
          statusCode: 404,
        };
      }

      const balanceAmount =
        Number(isOrderAvailable?.total_amount) - Number(totalAmountPaid);

      if (amount_paid > balanceAmount) {
        await session.abortTransaction();
        return {
          success: false,
          message: `Amount paid exceeds the balance amount of ${balanceAmount}`,
          statusCode: 400,
        };
      }

      if (isBookingAvailable?.amount_paid > total_amount) {
        const refundAmount =
          Number(isBookingAvailable?.amount_paid) - Number(total_amount);

        const newPayment = new Payment({
          booking_id: booking_id,
          user_id,
          amount: refundAmount,
          payment_method: payment_method || "cash",
          payment_state: "complete",
          transaction_type: "debit",
          status: "success",
          stage,
          payment_date: new Date(),
          created_by: user_id,
          updated_by: user_id,
        });

        await newPayment.save({ session });
        const refund = new Refund({
          payment_id: newPayment?._id,
          user_id: user_id,
          amount: refundAmount,
          reason: "Order total amount exceeds booking total amount",
          status: "pending",
          created_by: user_id,
          updated_by: user_id,
        });
        await refund.save({ session });

        const updateOrder = await Order.findByIdAndUpdate(
          { order_id: isOrderAvailable?._id },
          {
            amount_paid: totalAmountPaid,
            total_amount: total_amount,
            updated_by: user_id,
          },
          { new: true, session }
        );
        await session.commitTransaction();
        return {
          success: true,
          message: "Payment refund initiated successfully",
          data: newPayment,
          statusCode: 201,
        };
      }

      let paymentState =
        totalAmountPaid < total_amount ? "partial" : "complete";

      //If the cases are not covered
      const newPayment = new Payment({
        booking_id: booking_id,
        user_id,
        amount: amount_paid,
        payment_method: payment_method || "cash",
        payment_state: paymentState,
        transaction_type: "credit",
        status: "success",
        stage,
        payment_date: new Date(),
        created_by: user_id,
        updated_by: user_id,
      });

      await newPayment.save({ session });

      const updateOrder = await Order.findByIdAndUpdate(
        { order_id: isOrderAvailable?._id },
        {
          amount_paid: totalAmountPaid,
          total_amount: total_amount,
          updated_by: user_id,
        },
        { new: true, session }
      );
      await session.commitTransaction();
      return {
        success: true,
        message: "Payment created successfully",
        data: newPayment,
        statusCode: 201,
      };
    } else if (stage === "booking") {
      let paymentState = amount_paid < total_amount ? "partial" : "complete";

      // Create payment directly
      const newPayment = new Payment({
        booking_id,
        user_id,
        amount: amount_paid,
        payment_method: payment_method || "cash",
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
      return {
        success: true,
        message: "Payment created successfully",
        data: newPayment,
        statusCode: 201,
      };
    }
  } catch (error) {
    console.error("addPayment error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};

export const updatePayment = async (body, user_id) => {
  const { booking_id, amount_paid, total_amount, payment_method, stage } = body;
  const session = await mongoose.startSession(); // Start a session
  try {
    session.startTransaction(); // Start a transaction
    const isBookingAvailable = await Booking.findOne(
      { _id: booking_id, isDeleted: false },
      null,
      { session }
    );

    if (!isBookingAvailable) {
      await session.abortTransaction();
      return {
        success: false,
        message: "Booking not found",
        statusCode: 404,
      };
    }

    if (stage === "order") {
      const isOrderAvailable = await Order.findOne(
        { booking_id: booking_id, isDeleted: false },
        null,
        { session }
      );

      if (!isOrderAvailable) {
        await session.abortTransaction();
        return {
          success: false,
          message: "Order not found",
          statusCode: 404,
        };
      }

      if (isOrderAvailable?.amount_paid === isOrderAvailable?.total_amount) {
        await session.abortTransaction();
        return {
          success: false,
          message: "Order is already paid",
          statusCode: 400,
        };
      }

      const balanceAmount =
        Number(isOrderAvailable?.total_amount) -
        Number(isOrderAvailable?.amount_paid);

      if (amount_paid > balanceAmount) {
        await session.abortTransaction();
        return {
          success: false,
          message: `Amount paid exceeds the balance amount of ${balanceAmount}`,
          statusCode: 400,
        };
      }

      let paymentState = amount_paid < total_amount ? "partial" : "complete";

      //If the cases are not covered
      const newPayment = new Payment({
        booking_id: booking_id,
        user_id,
        amount: amount_paid,
        payment_method: payment_method || "cash",
        payment_state: paymentState,
        transaction_type: "credit",
        status: "success",
        stage,
        payment_date: new Date(),
        created_by: user_id,
        updated_by: user_id,
      });

      await newPayment.save({ session });

      const updateOrder = await Order.findByIdAndUpdate(
        { order_id: isOrderAvailable?._id },
        {
          $inc: { amount_paid: +amount_paid },
          total_amount: total_amount,
          updated_by: user_id,
        },
        { new: true, session }
      );
      await session.commitTransaction();
      return {
        success: true,
        message: "Payment created successfully",
        data: newPayment,
        statusCode: 201,
      };
    } else if (stage === "booking") {
      const balanceAmount =
        Number(isBookingAvailable?.total_amount) -
        Number(isBookingAvailable?.amount_paid);

      if (
        isBookingAvailable?.amount_paid === isBookingAvailable?.total_amount
      ) {
        await session.abortTransaction();
        return {
          success: false,
          message: "Booking is already paid",
          statusCode: 400,
        };
      }

      if (amount_paid > balanceAmount) {
        await session.abortTransaction();
        return {
          success: false,
          message: `Amount paid exceeds the balance amount of ${balanceAmount}`,
          statusCode: 400,
        };
      }
    }

    let paymentState = amount_paid < total_amount ? "partial" : "complete";
    const newPayment = new Payment({
      booking_id: booking_id,
      user_id,
      amount: amount_paid,
      payment_method: payment_method || "cash",
      payment_state: paymentState,
      status: "success",
      stage,
      payment_date: new Date(),
      created_by: user_id,
      updated_by: user_id,
    });

    await newPayment.save();
    await session.commitTransaction();
    return {
      success: true,
      message: "Payment created successfully",
      data: newPayment,
      statusCode: 201,
    };
  } catch (error) {
    console.error("addPayment error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};
