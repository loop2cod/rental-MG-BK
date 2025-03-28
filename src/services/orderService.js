import Order from "../models/OrderSchema.js";
import Inventory from "../models/InventorySchema.js";
import Booking from "../models/BookingSchema.js";
import mongoose from "mongoose";

export const createOrder = async (orderData) => {
  // Destructure all values from order
  let {
    booking_id,
    order_id,
    user_id,
    order_date,
    order_items,
    no_of_days,
    outsourced_items,
    total_amount,
    created_by,
    updated_by,
    from_date,
    to_date,
    from_time,
    to_time,
    amount_paid,
  } = orderData;

  // Start a session
  const session = await mongoose.startSession();

  try {
    // Start transaction
    session.startTransaction();

    // All operations within the transaction
    const isBookingAvailable = await Booking.findOne(
      {
        _id: booking_id,
        isDeleted: false,
      },
      null,
      { session }
    );

    if (!isBookingAvailable) {
      await session.abortTransaction();
      return {
        success: false,
        message: "Booking is not available",
        statusCode: 400,
      };
    }

    // Check stock availability
    const checkStockAvailability = await Promise.all(
      order_items.map(async (item) => {
        const inventory = await Inventory.findOne(
          { product_id: item.product_id },
          { quantity: 1, reserved_quantity: 1, available_quantity: 1, _id: 0 },
          { session }
        );

        if (!inventory) {
          return {
            product_id: item.product_id,
            isAvailable: false,
            message: "Product not found in inventory",
          };
        }

        const isAvailable = inventory.available_quantity >= item.quantity;

        return {
          product_id: item.product_id,
          requested_quantity: item.quantity,
          available_quantity: inventory.available_quantity,
          isAvailable,
          message: isAvailable ? "Stock available" : "Insufficient stock",
        };
      })
    );

    const unavailableItems = checkStockAvailability.filter(
      (item) => !item.isAvailable
    );

    if (unavailableItems.length > 0) {
      await session.abortTransaction();
      return {
        success: false,
        message: "Some items are out of stock",
        data: unavailableItems,
        statusCode: 400,
      };
    }

    const mergedOrderItems = {};
    order_items.forEach((item) => {
      if (mergedOrderItems[item.product_id]) {
        mergedOrderItems[item.product_id].quantity += item.quantity;
        mergedOrderItems[item.product_id].total_price += item.total_price;
      } else {
        mergedOrderItems[item.product_id] = { ...item };
      }
    });
    order_items = Object.values(mergedOrderItems);

    // Preprocess outsourced_items to merge duplicates
    const mergedOutsourcedItems = {};
    outsourced_items?.forEach((item) => {
      if (mergedOutsourcedItems[item.out_product_id]) {
        mergedOutsourcedItems[item.out_product_id].quantity += item.quantity;
        mergedOutsourcedItems[item.out_product_id].total_price +=
          item.total_price;
      } else {
        mergedOutsourcedItems[item.out_product_id] = { ...item };
      }
    });
    outsourced_items = Object.values(mergedOutsourcedItems);

    // Update inventory quantities
    await Promise.all(
      order_items.map(async (item) => {
        await Inventory.findOneAndUpdate(
          { product_id: item.product_id },
          {
            $inc: {
              available_quantity: -item.quantity,
              reserved_quantity: item.quantity,
            },
          },
          { session }
        );
      })
    );

    // Update booking status
    const updateBooking = await Booking.findByIdAndUpdate(
      booking_id,
      {
        status: "Success",
      },
      { new: true, session }
    );

    // Create new order
    const newOrder = new Order({
      booking_id,
      user_id,
      order_date,
      order_items,
      outsourced_items,
      total_amount,
      no_of_days,
      from_date,
      to_date,
      from_time,
      to_time,
      // amount_paid,
      created_by,
      updated_by,
    });

    await newOrder.save({ session });

    // Commit the transaction
    await session.commitTransaction();

    return {
      success: true,
      message: "Order created successfully",
      data: newOrder,
      statusCode: 201,
    };
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction();
    console.error("createOrder error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  } finally {
    // End session
    session.endSession();
  }
};

export const updateOrder = async (orderId, orderUpdates) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Check if the order exists
    const existingOrder = await Order.findOne(
      { _id: orderId, isDeleted: false },
      null,
      { session }
    );
    if (!existingOrder) {
      await session.abortTransaction();
      return {
        success: false,
        message: "Order not found",
        statusCode: 404,
      };
    }

    // Check stock availability for updated items if necessary
    const checkStockAvailability = await Promise.all(
      orderUpdates.order_items.map(async (item) => {
        const inventory = await Inventory.findOne(
          { product_id: item.product_id },
          { quantity: 1, reserved_quantity: 1, available_quantity: 1, _id: 0 },
          { session }
        );

        if (!inventory) {
          return {
            product_id: item.product_id,
            isAvailable: false,
            message: "Product not found in inventory",
          };
        }

        const isAvailable = inventory.available_quantity >= item.quantity;

        return {
          product_id: item.product_id,
          requested_quantity: item.quantity,
          available_quantity: inventory.available_quantity,
          isAvailable,
          message: isAvailable ? "Stock available" : "Insufficient stock",
        };
      })
    );

    const unavailableItems = checkStockAvailability.filter(
      (item) => !item.isAvailable
    );
    if (unavailableItems.length > 0) {
      await session.abortTransaction();
      return {
        success: false,
        message: "Some items are out of stock",
        data: unavailableItems,
        statusCode: 400,
      };
    }

    const mergedOrderItems = {};
    orderUpdates.order_items.forEach((item) => {
      if (mergedOrderItems[item.product_id]) {
        mergedOrderItems[item.product_id].quantity += item.quantity;
        mergedOrderItems[item.product_id].total_price += item.total_price;
      } else {
        mergedOrderItems[item.product_id] = { ...item };
      }
    });
    orderUpdates.order_items = Object.values(mergedOrderItems);

    // Preprocess outsourced_items to merge duplicates
    const mergedOutsourcedItems = {};
    orderUpdates.outsourced_items?.forEach((item) => {
      if (mergedOutsourcedItems[item.out_product_id]) {
        mergedOutsourcedItems[item.out_product_id].quantity += item.quantity;
        mergedOutsourcedItems[item.out_product_id].total_price +=
          item.total_price;
      } else {
        mergedOutsourcedItems[item.out_product_id] = { ...item };
      }
    });
    orderUpdates.outsourced_items = Object.values(mergedOutsourcedItems);

    // Update inventory quantities
    await Promise.all(
      orderUpdates.order_items.map(async (item) => {
        await Inventory.findOneAndUpdate(
          { product_id: item.product_id },
          {
            $inc: {
              available_quantity: -item.quantity,
              reserved_quantity: item.quantity,
            },
          },
          { session }
        );
      })
    );

    // Update the order
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      {
        ...orderUpdates,
        updated_by: orderUpdates.user_id,
      },
      { new: true, session }
    );

    await session.commitTransaction();
    return {
      success: true,
      message: "Order updated successfully",
      data: updatedOrder,
      statusCode: 200,
    };
  } catch (error) {
    await session.abortTransaction();
    console.error("updateOrder error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  } finally {
    session.endSession();
  }
};

export const getOrderDetails = async (id) => {
  try {
    const order = await Order.findById(id).populate({
      path: "user_id",
      select: "name mobile",
    });
    if (!order) {
      return {
        success: false,
        message: "Order not found",
        statusCode: 404,
      };
    }

    // Map through order items and attach inventory details
    const orderItemsWithInventory = await Promise.all(
      order.order_items.map(async (item) => {
        const inventory = await Inventory.findOne(
          { product_id: item.product_id },
          { quantity: 1, reserved_quantity: 1, available_quantity: 1, _id: 0 }
        );

        // Return the order item with its inventory details
        return {
          ...item.toObject(),
          ...inventory.toObject(),
        };
      })
    );

    // Return order details with updated order items
    return {
      success: true,
      data: {
        ...order.toObject(),
        order_items: orderItemsWithInventory, // Replace original order_items with the enhanced version
      },
      statusCode: 200,
    };
  } catch (error) {
    console.error("Error in getOrderDetails => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};

export const getOrderListWithPaginationAndSearch = async (
  page,
  limit,
  search
) => {
  try {
    let orders;
    let totalOrders;
    const query = {};

    // Check if search is a valid ObjectId (for user_id & booking_id)
    const isObjectId = mongoose.Types.ObjectId.isValid(search);

    // Check if search is a number (for total_amount and total_quantity)
    const isNumber = !isNaN(search);

    // Check if search is a valid date
    const isValidDate = !isNaN(Date.parse(search));

    if (search) {
      query.$or = [
        {
          order_items: {
            $elemMatch: { name: { $regex: search, $options: "i" } },
          },
        },
        {
          outsourced_items: {
            $elemMatch: { name: { $regex: search, $options: "i" } },
          },
        },
        { status: { $regex: search, $options: "i" } },
        { from_time: { $regex: search, $options: "i" } },
        { to_time: { $regex: search, $options: "i" } },
      ];

      if (isObjectId) {
        query.$or.push({ user_id: search }, { booking_id: search });
      }

      if (isNumber) {
        query.$or.push(
          { total_amount: Number(search) }, // Exact match for total_amount
          { total_quantity: Number(search) }, // Exact match for total_quantity
          { amount_paid: Number(search) }, // Exact match for amount_paid
          { no_of_days: Number(search) },
          { order_items: { $elemMatch: { quantity: Number(search) } } },
          { order_items: { $elemMatch: { price: Number(search) } } },
          { order_items: { $elemMatch: { total_price: Number(search) } } },
          { outsourced_items: { $elemMatch: { quantity: Number(search) } } },
          { outsourced_items: { $elemMatch: { price: Number(search) } } },
          { outsourced_items: { $elemMatch: { total_price: Number(search) } } }
        );
      }

      if (isValidDate) {
        const dateSearch = new Date(search);
        query.$or.push(
          {
            order_date: {
              $gte: dateSearch,
              $lt: new Date(dateSearch.getTime() + 24 * 60 * 60 * 1000),
            },
          },
          {
            booking_date: {
              $gte: dateSearch,
              $lt: new Date(dateSearch.getTime() + 24 * 60 * 60 * 1000),
            },
          },
          {
            from_date: {
              $gte: dateSearch,
              $lt: new Date(dateSearch.getTime() + 24 * 60 * 60 * 1000),
            },
          },
          {
            to_date: {
              $gte: dateSearch,
              $lt: new Date(dateSearch.getTime() + 24 * 60 * 60 * 1000),
            },
          }
        );
      }
    }

    orders = await Order.find(query)
      .populate({
        path: "user_id",
        select: "name mobile",
      })
      .sort({ order_date: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    totalOrders = await Order.countDocuments(query);

    return {
      success: true,
      message: "Orders fetched successfully",
      data: {
        orders,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalOrders / limit),
          totalOrders,
          itemsPerPage: limit,
        },
      },
      statusCode: 200,
    };
  } catch (error) {
    console.error("Error in getOrderListWithPaginationAndSearch => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};
