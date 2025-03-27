import Payment from "../models/PaymentSchema.js";
import Refund from "../models/RefundSchema.js";

export const addPayment = async ({
  booking_id,
  amount_paid,
  total_amount,
  payment_method,
  user_id,
  stage,
}) => {
  try {
    if (stage === "order") {
      if (isBookingAvailable?.amount_paid >= order?.total_amount) {
        const newPayment = new Payment({
          booking_id: booking_id,
          user_id,
          amount: amount_paid,
          payment_method: payment_method || "cash",
          payment_state: "full",
          status: "success",
          stage,
          payment_date: new Date(),
          created_by: user_id,
          updated_by: user_id,
        });

        await newPayment.save();
        const refund = new Refund({
          payment_id: newPayment?._id,
          user_id: order?.user_id,
          amount: order?.total_amount,
          reason: "Order total amount exceeds booking total amount",
          status: "pending",
          created_by: order?.user_id,
          updated_by: order?.user_id,
        });
        await refund.save();
        return {
          success: true,
          message: "Payment created successfully",
          data: newPayment,
          statusCode: 201,
        };
      }
    }

    let paymentState = amount_paid < total_amount ? "partial" : "complete";
    const newPayment = new Payment({
      booking_id: booking_id,
      user_id,
      amount: amount,
      payment_method: payment_method || "cash",
      payment_state: paymentState,
      status: "success",
      stage,
      payment_date: new Date(),
      created_by: user_id,
      updated_by: user_id,
    });

    await newPayment.save();
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

// export const addOrderPayment = async (
//   booking_id,
//   amount,
//   totalAmount,
//   paymentMethod,
//   userId,
//   session
// ) => {
//   try {
//     // Determine the payment state based on the amount
//     const paymentState = amount < totalAmount ? "partial" : "complete";

//     const newPayment = new Payment({
//       booking_id: booking_id,
//       user_id: userId,
//       amount: amount,
//       payment_method: paymentMethod,
//       payment_state: paymentState,
//       status: "success",
//       stage: "order",
//       payment_date: new Date(),
//       created_by: userId,
//       updated_by: userId,
//     });

//     await newPayment.save({ session });

//     return newPayment;
//   } catch (error) {
//     console.error("addPayment error => ", error);
//     return {
//       success: false,
//       message: "Internal server error",
//       statusCode: 500,
//     };
//   }
// };
