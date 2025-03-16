import Payment from "../models/PaymentSchema.js";

export const addBookingPayment = async (
  bookingId,
  amount,
  totalAmount,
  paymentMethod,
  userId
) => {
  try {
    // Determine the payment state based on the amount
    const paymentState = amount < totalAmount ? "partial" : "complete";

    const newPayment = new Payment({
      booking_id: bookingId,
      user_id: userId,
      amount: amount,
      payment_method: paymentMethod,
      payment_state: paymentState,
      status: "success",
      payment_date: new Date(),
      created_by: userId,
      updated_by: userId,
    });

    await newPayment.save();

    return newPayment;
  } catch (error) {
    console.error("addPayment error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};
