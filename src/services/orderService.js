import Order from "../models/OrderSchema.js";
import Inventory from "../models/InventorySchema.js";
import Booking from "../models/BookingSchema.js";
import mongoose from "mongoose";

export const createOrder = async (orderData) => {
  // Destructure all values from order
  let {
    booking_id,
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
    discount,
    sub_total,
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
      discount,
      sub_total,
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

export const getOrderBookingComparisonList = async (orderId, bookingId) => {
  try {
    // 1. Fetch Order and Booking Details
    const order = await Order.findById(orderId);
    const booking = await Booking.findById(bookingId);

    if (!order || !booking) {
      return {
        success: false,
        message: "No order or booking found",
        statusCode: 404,
      };
    }

    // 2. Extract Products from Order and Booking (Avoid null product_id)
    const orderProducts = order.order_items
      .filter((item) => item.product_id) // Ensure product_id is not null
      .map((item) => ({
        product_id: item.product_id.toString(),
        name: item.name,
        quantity: item.quantity,
      }));

    const bookingProducts = booking.booking_items
      .filter((item) => item.product_id) // Ensure product_id is not null
      .map((item) => ({
        product_id: item.product_id.toString(),
        name: item.name,
        quantity: item.quantity,
      }));

    const orderOutsourcedProducts = order.outsourced_items
      .filter((item) => item.out_product_id)
      .map((item) => ({
        product_id: item.out_product_id.toString(),
        name: item.name,
        quantity: item.quantity,
      }));

    const bookingOutsourcedProducts = booking.outsourced_items
      .filter((item) => item.out_product_id)
      .map((item) => ({
        product_id: item.out_product_id.toString(),
        name: item.name,
        quantity: item.quantity,
      }));

    // 3. Determine Products Needed from Order and Inventory
    const productsToTakeFromOrder = [];
    const productsToBringFromInventory = [];
    const outsourcedToTakeFromOrder = [];
    const outsourcedToBringFromInventory = [];

    for (const bookingProduct of bookingProducts) {
      const matchingOrderProduct = orderProducts.find(
        (op) => op.product_id === bookingProduct.product_id
      );

      if (matchingOrderProduct) {
        productsToTakeFromOrder.push({
          product_id: bookingProduct.product_id,
          name: bookingProduct.name,
          quantity: bookingProduct.quantity,
        });
      } else {
        productsToBringFromInventory.push({
          product_id: bookingProduct.product_id,
          name: bookingProduct.name,
          quantity: bookingProduct.quantity,
        });
      }
    }

    // Fetch inventory data in parallel
    const inventoryResults = await Promise.all(
      productsToBringFromInventory.map((product) =>
        Inventory.findOne({ product_id: product.product_id }).lean()
      )
    );

    productsToBringFromInventory.forEach((product, index) => {
      product.available_quantity =
        inventoryResults[index]?.available_quantity || 0;
    });

    // 4. Handle Outsourced Products
    for (const bookingOutsourced of bookingOutsourcedProducts) {
      const matchingOrderOutsourced = orderOutsourcedProducts.find(
        (op) => op.product_id === bookingOutsourced.product_id
      );

      if (matchingOrderOutsourced) {
        outsourcedToTakeFromOrder.push({
          product_id: bookingOutsourced.product_id,
          name: bookingOutsourced.name,
          quantity: bookingOutsourced.quantity,
        });
      } else {
        outsourcedToBringFromInventory.push({
          product_id: bookingOutsourced.product_id,
          name: bookingOutsourced.name,
          quantity: bookingOutsourced.quantity,
        });
      }
    }

    // Fetch inventory data for outsourced products in parallel
    const outsourcedInventoryResults = await Promise.all(
      outsourcedToBringFromInventory.map((product) =>
        Inventory.findOne({ product_id: product.product_id }).lean()
      )
    );

    outsourcedToBringFromInventory.forEach((product, index) => {
      product.available_quantity =
        outsourcedInventoryResults[index]?.available_quantity || 0;
    });

    // 5. Return Structured Response
    return {
      success: true,
      message: "Comparison completed",
      data: {
        productsToTakeFromOrder,
        productsToBringFromInventory,
        outsourcedToTakeFromOrder,
        outsourcedToBringFromInventory,
      },
      statusCode: 200,
    };
  } catch (error) {
    console.error("Error comparing order and booking:", error);
    return {
      success: false,
      message: error.message || "Internal server error",
      statusCode: 500,
    };
  }
};

export const handleOrderDispatch = async (orderId, dispatchData, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(orderId).session(session);

    if (!order) {
      return {
        success: false,
        message: "No order found",
        statusCode: 404,
      };
    }

    // Validate dispatchData
    if (!dispatchData || !Array.isArray(dispatchData)) {
      return {
        success: false,
        message: "Invalid dispatch data provided",
        statusCode: 400,
      };
    }

    // Prepare dispatch items and outsourced dispatch items
    const dispatchItems = [];
    const outsourcedDispatchItems = [];

    for (const item of dispatchData) {
      if (
        (!item.product_id && !item.out_product_id) ||
        !item.quantity ||
        !item.dispatch_date ||
        !item.dispatch_time
      ) {
        return {
          success: false,
          message:
            "Invalid dispatch item data: either product_id or out_product_id is required, along with quantity, dispatch_date, and dispatch_time",
          statusCode: 400,
        };
      }

      const dispatchItem = {
        quantity: item.quantity,
        dispatch_date: item.dispatch_date,
        dispatch_time: item.dispatch_time,
        dispatched_by: userId,
        status: "dispatched", // Initial status
      };

      if (item.out_product_id) {
        dispatchItem.out_product_id = item.out_product_id;
        outsourcedDispatchItems.push(dispatchItem);
      } else {
        dispatchItem.product_id = item.product_id;
        dispatchItems.push(dispatchItem);
      }
    }

    // Update order with dispatch items
    order.dispatch_items = [...(order.dispatch_items || []), ...dispatchItems];
    order.outsourced_dispatch_items = [
      ...(order.outsourced_dispatch_items || []),
      ...outsourcedDispatchItems,
    ];

    // Check if all items are dispatched
    let allItemsDispatched = true;
    for (const orderItem of order.order_items) {
      const dispatchedQuantity = order.dispatch_items
        .filter(
          (di) =>
            di.product_id &&
            orderItem.product_id &&
            di.product_id.toString() === orderItem.product_id.toString()
        )
        .reduce((sum, di) => sum + di.quantity, 0);

      if (dispatchedQuantity < orderItem.quantity) {
        allItemsDispatched = false;
        break;
      }
    }

    let allOutsourcedItemsDispatched = true;
    for (const outsourcedItem of order.outsourced_items) {
      const dispatchedQuantity = order.outsourced_dispatch_items
        .filter(
          (di) =>
            di.out_product_id &&
            outsourcedItem.out_product_id &&
            di.out_product_id.toString() ===
              outsourcedItem.out_product_id.toString()
        )
        .reduce((sum, di) => sum + di.quantity, 0);

      if (dispatchedQuantity < outsourcedItem.quantity) {
        allOutsourcedItemsDispatched = false;
        break;
      }
    }

    // Update order status based on dispatch progress
    if (allItemsDispatched && allOutsourcedItemsDispatched) {
      order.status = "delivered";
    } else {
      order.status = "initiated"; // Partial dispatch
    }

    // Save the updated order
    await order.save({ session });
    await session.commitTransaction();

    return {
      success: true,
      message: "Order dispatch recorded successfully",
      data: {
        orderId: order._id,
        status: order.status,
      },
      statusCode: 200,
    };
  } catch (error) {
    await session.abortTransaction();
    console.error("Error handling order dispatch:", error);
    return {
      success: false,
      message: error.message || "Internal server error",
      statusCode: 500,
    };
  } finally {
    session.endSession();
  }
};

export const handleOrderReturn = async (orderId, returnData, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(orderId).session(session);

    if (!order) {
      return {
        success: false,
        message: "No order found",
        statusCode: 404,
      };
    }

    // Validate returnData
    if (!returnData || !Array.isArray(returnData)) {
      return {
        success: false,
        message: "Invalid return data provided",
        statusCode: 400,
      };
    }

    // Process return items
    const returnItems = [];
    const outsourcedReturnItems = [];

    for (const item of returnData) {
      if (
        (!item.product_id && !item.out_product_id) ||
        !item.quantity ||
        !item.dispatch_date ||
        !item.dispatch_time
      ) {
        return {
          success: false,
          message:
            "Invalid return item data: either product_id or out_product_id is required, along with quantity, dispatch_date, and dispatch_time",
          statusCode: 400,
        };
      }

      const returnItem = {
        quantity: item.quantity,
        dispatch_date: item.dispatch_date,
        dispatch_time: item.dispatch_time,
        returned_by: userId,
        status: "inreturn",
      };

      if (item.out_product_id) {
        returnItem.out_product_id = item.out_product_id;
        outsourcedReturnItems.push(returnItem);
      } else {
        returnItem.product_id = item.product_id;
        returnItems.push(returnItem);
      }
    }

    // Update order with return items
    order.return_items = [...(order.return_items || []), ...returnItems];
    order.outsourced_return_items = [
      ...(order.outsourced_return_items || []),
      ...outsourcedReturnItems,
    ];

    // Check if all items are returned
    let allItemsReturned = true;
    for (const orderItem of order.order_items) {
      const returnedQuantity = order.return_items
        .filter(
          (ri) =>
            ri.product_id &&
            orderItem.product_id &&
            ri.product_id.toString() === orderItem.product_id.toString()
        )
        .reduce((sum, ri) => sum + ri.quantity, 0);

      if (returnedQuantity < orderItem.quantity) {
        allItemsReturned = false;
        break;
      }
    }

    let allOutsourcedItemsReturned = true;
    for (const outsourcedItem of order.outsourced_items) {
      const returnedQuantity = order.outsourced_return_items
        .filter(
          (ri) =>
            ri.out_product_id &&
            outsourcedItem.out_product_id &&
            ri.out_product_id.toString() ===
              outsourcedItem.out_product_id.toString()
        )
        .reduce((sum, ri) => sum + ri.quantity, 0);

      if (returnedQuantity < outsourcedItem.quantity) {
        allOutsourcedItemsReturned = false;
        break;
      }
    }

    // Update order status based on return progress
    if (allItemsReturned && allOutsourcedItemsReturned) {
      order.status = "Returned";
    } else {
      order.status = "inreturn";
    }

    // Save the updated order
    await order.save({ session });
    await session.commitTransaction();

    return {
      success: true,
      message: "Order return recorded successfully",
      data: {
        orderId: order._id,
        status: order.status,
      },
      statusCode: 200,
    };
  } catch (error) {
    await session.abortTransaction();
    console.error("Error handling order return:", error);
    return {
      success: false,
      message: error.message || "Internal server error",
      statusCode: 500,
    };
  } finally {
    session.endSession();
  }
};
