import Order from "../models/OrderSchema.js";

export const createOrder = async (order) => {
  try {
    const newOrder = new Order({
      order_id: order.order_id,
      user_id: order.user_id,
      order_date: order.order_date,
      order_items: order.order_items,
      total_amount: order.total_amount,
      created_by: order.created_by,
      updated_by: order.updated_by,
    });

    await newOrder.save();

    return {
      success: true,
      message: "Order created successfully",
      data: newOrder,
      statusCode: 201,
    };
  } catch (error) {
    console.error("createOrder error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};
