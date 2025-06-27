import Order from "../models/OrderSchema.js";
import Inventory from "../models/InventorySchema.js";
import Booking from "../models/BookingSchema.js";
import User from "../models/UserSchema.js";
import mongoose from "mongoose";
import Product from "../models/ProductSchema.js";
import createNotification from "../utils/createNotification.js";

export const createOrder = async (orderData, userId) => {
  let {
    booking_id,
    user_phone,
    user_secondary_mobile,
    user_name,
    user_proof_type,
    user_proof_id,
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
    address,
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

    let user_id = isBookingAvailable?.user_id;
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
    const isUserExists = await User.findById(user_id, null, {
      session,
    });

    if (isUserExists) {
      user_id = isUserExists._id;
      if (
        isUserExists?.name !== user_name ||
        isUserExists?.proof_type !== user_proof_type ||
        isUserExists?.proof_id !== user_proof_id
      ) {
        await User.findByIdAndUpdate(
          user_id,
          {
            name: user_name,
            proof_type: user_proof_type,
            proof_id: user_proof_id,
            updated_by: userId,
          },
          { session }
        );
      }
    } else {
      const newUser = new User({
        name: user_name,
        mobile: user_phone,
        secondary_mobile: user_secondary_mobile,
        user_role: "customer",
        proof_type: user_proof_type,
        proof_id: user_proof_id,
        password: defaultPassword,
        created_by: userId,
        updated_by: userId,
      });

      await newUser.save({ session });
      user_id = newUser._id;
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
      address,
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
    createNotification("Order created successfully", "success");

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

export const updateOrder = async (orderId, orderUpdates, userId) => {
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

    let user_id = existingOrder?.user_id;
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
    const isUserExists = await User.findById(user_id, null, {
      session,
    });

    if (isUserExists) {
      user_id = isUserExists._id;
      if (
        isUserExists?.name !== orderUpdates?.user_name ||
        isUserExists?.proof_type !== orderUpdates?.user_proof_type ||
        isUserExists?.proof_id !== orderUpdates?.user_proof_id
      ) {
        await User.findByIdAndUpdate(
          user_id,
          {
            name: orderUpdates?.user_name,
            proof_type: orderUpdates?.user_proof_type,
            proof_id: orderUpdates?.user_proof_id,
            updated_by: userId,
          },
          { session }
        );
      }
    } else {
      const newUser = new User({
        name: orderUpdates?.user_name,
        mobile: orderUpdates?.user_phone,
        secondary_mobile: orderUpdates?.user_secondary_mobile,
        user_role: "customer",
        proof_type: orderUpdates?.user_proof_type,
        proof_id: orderUpdates?.user_proof_id,
        password: defaultPassword,
        created_by: userId,
        updated_by: userId,
      });

      await newUser.save({ session });
      user_id = newUser._id;
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
    const orderDetails = await Order.aggregate([
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
      {
        $unwind: "$user",
      },
      {
        $lookup: {
          from: "payments",
          localField: "booking_id",
          foreignField: "booking_id",
          as: "payments",
        },
      },
      {
        $addFields: {
          total_amount_paid: {
            $sum: "$payments.amount",
          },
        },
      },
      {
        $project: {
          _id: 1,
          order_id: 1,
          user_id: 1,
          booking_id: 1,
          order_items: 1,
          outsourced_items: 1,
          dispatch_items: 1,
          outsourced_dispatch_items: 1,
          address: 1,
          status: 1,
          from_time: 1,
          to_time: 1,
          order_date: 1,
          booking_date: 1,
          from_date: 1,
          to_date: 1,
          no_of_days: 1,
          total_amount: 1,
          total_amount_paid: 1,
          amount_paid: 1,
          discount: 1,
          user: {
            name: 1,
            mobile: 1,
          },
          payments: {
            _id: 1,
            amount: 1,
            payment_method: 1,
            payment_date: 1,
          },
        },
      },
    ]);

    if (orderDetails.length === 0) {
      return {
        success: false,
        message: "Order not found",
        statusCode: 404,
      };
    }

    let order = orderDetails[0];

    // Update the amount_paid field with the total_amount_paid
    order.amount_paid = order.total_amount_paid;

    // Map through order items and attach inventory details
    const orderItemsWithInventory = await Promise.all(
      order.order_items.map(async (item) => {
        const inventory = await Inventory.findOne(
          { product_id: item.product_id },
          { reserved_quantity: 1, available_quantity: 1, _id: 0 }
        );
        // Return the order item with its inventory details
        return {
          ...item,
          ...inventory.toObject(),
        };
      })
    );

    // Return order details with updated order items
    return {
      success: true,
      data: {
        ...order,
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
        { address: { $regex: search, $options: "i" } },
        { status: { $regex: search, $options: "i" } },
        { from_time: { $regex: search, $options: "i" } },
        { to_time: { $regex: search, $options: "i" } },
        { order_id: { $regex: search, $options: "i" } },
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

    // Fetch orders with payment details
    orders = await Order.aggregate([
      {
        $match: query,
      },
      {
        $lookup: {
          from: "payments",
          localField: "booking_id",
          foreignField: "booking_id",
          as: "payments",
        },
      },
      {
        $addFields: {
          total_amount_paid: {
            $sum: "$payments.amount",
          },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $skip: (page - 1) * limit,
      },
      {
        $limit: limit,
      },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $project: {
          _id: 1,
          order_id: 1,
          user_id: 1,
          booking_id: 1,
          order_items: 1,
          outsourced_items: 1,
          address: 1,
          status: 1,
          from_time: 1,
          to_time: 1,
          order_date: 1,
          booking_date: 1,
          from_date: 1,
          to_date: 1,
          no_of_days: 1,
          total_amount: 1,
          amount_paid: 1,
          total_quantity: 1,
          total_amount_paid: 1,
          user: {
            name: 1,
            mobile: 1,
          },
        },
      },
    ]);

    orders = orders.map((order) => {
      order.amount_paid = order.total_amount_paid;
      return order;
    });

    // Count total orders matching the search query
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

    if (!dispatchData || !Array.isArray(dispatchData)) {
      return {
        success: false,
        message: "Invalid dispatch data provided",
        statusCode: 400,
      };
    }

    // Validate input items and check if already dispatched
    for (const item of dispatchData) {
      if (
        (!item.product_id && !item.out_product_id) ||
        !item.quantity ||
        !item.dispatch_date ||
        !item.dispatch_time
      ) {
        await session.abortTransaction();
        return {
          success: false,
          message:
            "Each dispatch item must include product_id or out_product_id, quantity, dispatch_date, and dispatch_time",
          statusCode: 400,
        };
      }

      // Check if the product can be dispatched (considering returns)
      if (item.product_id) {
        // Find the order item to get the total ordered quantity
        const orderItem = order.order_items.find(
          (oi) => oi.product_id?.toString() === item.product_id.toString()
        );

        if (!orderItem) {
          await session.abortTransaction();
          return {
            success: false,
            message: `Product ${item.product_id} not found in order`,
            statusCode: 400,
          };
        }

        // Calculate net dispatched quantity (dispatched - returned)
        const dispatchedQty = order.dispatch_items
          .filter(
            (di) =>
              di.product_id?.toString() === item.product_id.toString() &&
              di.status === "dispatched"
          )
          .reduce((sum, di) => sum + di.quantity, 0);

        const returnedQty = order.dispatch_items
          .filter(
            (ri) =>
              ri.product_id?.toString() === item.product_id.toString() &&
              ri.status === "returned"
          )
          .reduce((sum, ri) => sum + ri.quantity, 0);

        const netDispatchedQty = dispatchedQty - returnedQty;
        const remainingQty = orderItem.quantity - netDispatchedQty;

        if (item.quantity > remainingQty) {
          await session.abortTransaction();
          return {
            success: false,
            message: `Cannot dispatch ${item.quantity} units. Only ${remainingQty} units remaining for this product`,
            statusCode: 400,
          };
        }
      } else if (item.out_product_id) {
        // Find the outsourced item to get the total ordered quantity
        const outItem = order.outsourced_items.find(
          (oi) => oi.out_product_id?.toString() === item.out_product_id.toString()
        );

        if (!outItem) {
          await session.abortTransaction();
          return {
            success: false,
            message: `Outsourced product ${item.out_product_id} not found in order`,
            statusCode: 400,
          };
        }

        // Calculate net dispatched quantity (dispatched - returned)
        const dispatchedQty = order.outsourced_dispatch_items
          .filter(
            (odi) =>
              odi.out_product_id?.toString() === item.out_product_id.toString() &&
              odi.status === "dispatched"
          )
          .reduce((sum, odi) => sum + odi.quantity, 0);

        const returnedQty = order.outsourced_dispatch_items
          .filter(
            (ori) =>
              ori.out_product_id?.toString() === item.out_product_id.toString() &&
              ori.status === "returned"
          )
          .reduce((sum, ori) => sum + ori.quantity, 0);

        const netDispatchedQty = dispatchedQty - returnedQty;
        const remainingQty = outItem.quantity - netDispatchedQty;

        if (item.quantity > remainingQty) {
          await session.abortTransaction();
          return {
            success: false,
            message: `Cannot dispatch ${item.quantity} units. Only ${remainingQty} units remaining for this outsourced product`,
            statusCode: 400,
          };
        }
      }

      const dispatchEntry = {
        quantity: item.quantity,
        dispatch_date: new Date(item.dispatch_date),
        dispatch_time: item.dispatch_time,
        dispatched_by: userId,
        status: "dispatched",
      };

      if (item.product_id) {
        dispatchEntry.product_id = item.product_id;
        order.dispatch_items.push(dispatchEntry);
      } else if (item.out_product_id) {
        dispatchEntry.out_product_id = item.out_product_id;
        order.outsourced_dispatch_items.push(dispatchEntry);
      }
    }

    // Check all normal order items
    const allOrderItemsDispatched = order.order_items.every((orderItem) => {
      const dispatchedQtyFromDB = order.dispatch_items
        .filter(
          (di) =>
            di.product_id?.toString() === orderItem.product_id?.toString() &&
            di.status === "dispatched"
        )
        .reduce((sum, di) => sum + di.quantity, 0);

      const dispatchedQtyFromRequest = dispatchData
        .filter(
          (item) =>
            item.product_id?.toString() === orderItem.product_id?.toString()
        )
        .reduce((sum, item) => sum + item.quantity, 0);

      const totalQty = dispatchedQtyFromDB + dispatchedQtyFromRequest;
      return totalQty >= orderItem.quantity;
    });

    // Check all outsourced items
    const allOutsourcedItemsDispatched = order.outsourced_items.every(
      (outItem) => {
        const dispatchedQtyFromDB = order.outsourced_dispatch_items
          .filter(
            (odi) =>
              odi.out_product_id?.toString() ===
                outItem.out_product_id?.toString() &&
              odi.status === "dispatched"
          )
          .reduce((sum, odi) => sum + odi.quantity, 0);

        const dispatchedQtyFromRequest = dispatchData
          .filter(
            (item) =>
              item.out_product_id?.toString() ===
              outItem.out_product_id?.toString()
          )
          .reduce((sum, item) => sum + item.quantity, 0);

        const totalQty = dispatchedQtyFromDB + dispatchedQtyFromRequest;
        return totalQty >= outItem.quantity;
      }
    );

    const totalDispatchedProductQty = order.dispatch_items
      .filter((item) => item.status === "dispatched")
      .reduce((sum, item) => sum + (item.quantity || 0), 0);

    const totalDispatchedOutsourcedQty = order.outsourced_dispatch_items
      .filter((item) => item.status === "dispatched")
      .reduce((sum, item) => sum + (item.quantity || 0), 0);

    const hasOutsourcedProductsLeft =
      order.outsourced_items.length !== order.outsourced_dispatch_items.length;

    const hasProductsLeft =
      order.order_items.length !== order.dispatch_items.length;

    // ✅ Set status
    if (totalDispatchedProductQty === 0 && totalDispatchedOutsourcedQty === 0) {
      order.status = "initiated";
    } else if (!hasOutsourcedProductsLeft && !hasProductsLeft) {
      order.status = "dispatched";
    } else {
      order.status = "in-dispatch";
    }

    await order.save({ session });
    await session.commitTransaction();

    return {
      success: true,
      message: "Dispatch recorded successfully",
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

    if (!returnData || !Array.isArray(returnData)) {
      return {
        success: false,
        message: "Invalid return data provided",
        statusCode: 400,
      };
    }

    const inventoryUpdates = [];

    for (const item of returnData) {
      if (
        (!item.product_id && !item.out_product_id) ||
        !item.quantity ||
        !item.dispatch_date ||
        !item.dispatch_time
      ) {
        await session.abortTransaction();
        return {
          success: false,
          message:
            "Each return item must include product_id or out_product_id, quantity, dispatch_date, and dispatch_time",
          statusCode: 400,
        };
      }

      const returnEntry = {
        quantity: item.quantity,
        dispatch_date: new Date(item.dispatch_date),
        dispatch_time: item.dispatch_time,
        dispatched_by: userId,
        status: "returned",
      };

      if (item.product_id) {
        const dispatchedMatch = order.dispatch_items.find(
          (di) =>
            di.product_id?.toString() === item.product_id.toString() &&
            di.status === "dispatched"
        );

        if (!dispatchedMatch) {
          await session.abortTransaction();
          return {
            success: false,
            message: `No valid dispatch record found for product ${item.product_id}`,
            statusCode: 400,
          };
        }

        returnEntry.product_id = item.product_id;
        order.dispatch_items.push(returnEntry);

        inventoryUpdates.push({
          product_id: item.product_id,
          quantity: item.quantity,
        });
      } else if (item.out_product_id) {
        const outDispatchMatch = order.outsourced_dispatch_items.find(
          (odi) =>
            odi.out_product_id?.toString() === item.out_product_id.toString() &&
            odi.status === "dispatched"
        );

        if (!outDispatchMatch) {
          await session.abortTransaction();
          return {
            success: false,
            message: `No valid dispatch record found for outsourced product ${item.out_product_id}`,
            statusCode: 400,
          };
        }

        returnEntry.out_product_id = item.out_product_id;
        order.outsourced_dispatch_items.push(returnEntry);
      }
    }

    // Update inventory for returned products
    for (const update of inventoryUpdates) {
      const inventory = await Inventory.findOne({
        product_id: update.product_id,
      }).session(session);

      if (inventory) {
        inventory.available_quantity += update.quantity;
        inventory.reserved_quantity = Math.max(
          0,
          inventory.reserved_quantity - update.quantity
        );
        inventory.quantity =
          inventory.available_quantity + inventory.reserved_quantity;
        await inventory.save({ session });
      }
    }

    // 🧠 Check if ALL dispatched product items have been returned
    const allProductItemsReturned = order.order_items.every((orderItem) => {
      const dispatchedQty = order.dispatch_items
        .filter(
          (di) =>
            di.product_id?.toString() === orderItem.product_id?.toString() &&
            di.status === "dispatched"
        )
        .reduce((sum, item) => sum + item.quantity, 0);

      const returnedQtyFromDB = order.dispatch_items
        .filter(
          (ri) =>
            ri.product_id?.toString() === orderItem.product_id?.toString() &&
            ri.status === "returned"
        )
        .reduce((sum, item) => sum + item.quantity, 0);

      const returnedQtyFromRequest = returnData
        .filter(
          (item) =>
            item.product_id?.toString() === orderItem.product_id?.toString()
        )
        .reduce((sum, item) => sum + item.quantity, 0);

      return (
        dispatchedQty > 0 &&
        returnedQtyFromDB + returnedQtyFromRequest >= dispatchedQty
      );
    });

    const allOutsourcedItemsReturned = order.outsourced_items.every(
      (outItem) => {
        const dispatchedQty = order.outsourced_dispatch_items
          .filter(
            (odi) =>
              odi.out_product_id?.toString() ===
                outItem.out_product_id?.toString() &&
              odi.status === "dispatched"
          )
          .reduce((sum, item) => sum + item.quantity, 0);

        const returnedQtyFromDB = order.outsourced_dispatch_items
          .filter(
            (ri) =>
              ri.out_product_id?.toString() ===
                outItem.out_product_id?.toString() && ri.status === "returned"
          )
          .reduce((sum, item) => sum + item.quantity, 0);

        const returnedQtyFromRequest = returnData
          .filter(
            (item) =>
              item.out_product_id?.toString() ===
              outItem.out_product_id?.toString()
          )
          .reduce((sum, item) => sum + item.quantity, 0);

        return (
          dispatchedQty > 0 &&
          returnedQtyFromDB + returnedQtyFromRequest >= dispatchedQty
        );
      }
    );

    // ✅ Set order status
    const totalReturnedProductQty = order.dispatch_items
      .filter((i) => i.status === "returned")
      .reduce((sum, i) => sum + i.quantity, 0);
    const totalReturnedOutProdQty = order.outsourced_dispatch_items
      .filter((i) => i.status === "returned")
      .reduce((sum, i) => sum + i.quantity, 0);

    const hasPendingProductReturn = order.order_items.some((orderItem) => {
      const dispatched = order.dispatch_items
        .filter(
          (i) =>
            i.product_id?.toString() === orderItem.product_id?.toString() &&
            i.status === "dispatched"
        )
        .reduce((s, i) => s + i.quantity, 0);

      const returned = order.dispatch_items
        .filter(
          (i) =>
            i.product_id?.toString() === orderItem.product_id?.toString() &&
            i.status === "returned"
        )
        .reduce((s, i) => s + i.quantity, 0);

      return returned < dispatched;
    });

    const hasPendingOutProductReturn = order.outsourced_items.some(
      (outItem) => {
        const dispatched = order.outsourced_dispatch_items
          .filter(
            (i) =>
              i.out_product_id?.toString() ===
                outItem.out_product_id?.toString() && i.status === "dispatched"
          )
          .reduce((s, i) => s + i.quantity, 0);

        const returned = order.outsourced_dispatch_items
          .filter(
            (i) =>
              i.out_product_id?.toString() ===
                outItem.out_product_id?.toString() && i.status === "returned"
          )
          .reduce((s, i) => s + i.quantity, 0);

        return returned < dispatched;
      }
    );
    console.log("haspendingoutproductreturn=>", hasPendingOutProductReturn);
    console.log("hasPendingProductReturn=>", hasPendingProductReturn);

    if (totalReturnedProductQty === 0 && totalReturnedOutProdQty === 0) {
      order.status = "dispatched"; // still not returned
    } else if (!hasPendingProductReturn && !hasPendingOutProductReturn) {
      order.status = "Returned";
    } else {
      order.status = "in-return";
    }

    await order.save({ session });
    await session.commitTransaction();

    return {
      success: true,
      message: "Return recorded and inventory updated successfully",
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

export const handleDamagedProducts = async (
  orderId,
  damagedProducts,
  userId
) => {
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

    if (!damagedProducts || !Array.isArray(damagedProducts)) {
      return {
        success: false,
        message: "Invalid damaged products provided",
        statusCode: 400,
      };
    }

    // Get all product IDs in the order
    const orderProductIds = order.order_items.map((item) =>
      item.product_id?.toString()
    );

    // Validate that all damaged products are in the order
    const invalidProducts = damagedProducts.filter(
      (product) => !orderProductIds.includes(product.product_id?.toString())
    );

    if (invalidProducts.length > 0) {
      return {
        success: false,
        message: `Some products are not part of the order: ${invalidProducts
          .map((p) => p.product_id)
          .join(", ")}`,
        statusCode: 400,
      };
    }

    // Create array of damaged product objects
    const damagedProductsArray = damagedProducts.map((product) => ({
      product_id: product.product_id,
      quantity: product.quantity,
      remarks: product.remarks,
    }));

    // Update order with all damaged products
    await Order.findByIdAndUpdate(
      { _id: orderId },
      { $push: { damaged_products: { $each: damagedProductsArray } } },
      { session }
    );

    await session.commitTransaction();
    return {
      success: true,
      message: "Damaged products recorded",
      data: damagedProductsArray,
      statusCode: 200,
    };
  } catch (error) {
    await session.abortTransaction();
    console.error("Error handling damaged products:", error);
    return {
      success: false,
      message: error.message || "Internal server error",
      statusCode: 500,
    };
  } finally {
    session.endSession();
  }
};

export const handleDamagedOutsourcedProducts = async (
  orderId,
  damagedOutsourcedProducts,
  userId
) => {
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

    if (
      !damagedOutsourcedProducts ||
      !Array.isArray(damagedOutsourcedProducts)
    ) {
      return {
        success: false,
        message: "Invalid damaged outsourced products provided",
        statusCode: 400,
      };
    }

    // Get all outsourced product IDs in the order
    const orderOutsourcedProductIds = order.outsourced_items.map((item) =>
      item.out_product_id?.toString()
    );

    // Validate that all damaged outsourced products are in the order
    const invalidProducts = damagedOutsourcedProducts.filter(
      (product) =>
        !orderOutsourcedProductIds.includes(product.out_product_id?.toString())
    );

    if (invalidProducts.length > 0) {
      return {
        success: false,
        message: `Some outsourced products are not part of the order: ${invalidProducts
          .map((p) => p.out_product_id)
          .join(", ")}`,
        statusCode: 400,
      };
    }

    // Create array of damaged outsourced product objects
    const damagedOutsourcedProductsArray = damagedOutsourcedProducts.map(
      (product) => ({
        out_product_id: product.out_product_id,
        quantity: product.quantity,
        remarks: product.remarks,
      })
    );

    // Update order with all damaged outsourced products
    await Order.findByIdAndUpdate(
      { _id: orderId },
      {
        $push: {
          damaged_outsourced_products: {
            $each: damagedOutsourcedProductsArray,
          },
        },
      },
      { session }
    );

    await session.commitTransaction();
    return {
      success: true,
      message: "Damaged outsourced products recorded",
      data: damagedOutsourcedProductsArray,
      statusCode: 200,
    };
  } catch (error) {
    await session.abortTransaction();
    console.error("Error handling damaged outsourced products:", error);
    return {
      success: false,
      message: error.message || "Internal server error",
      statusCode: 500,
    };
  } finally {
    session.endSession();
  }
};

export const getProductOrdersHistory = async (productId) => {
  try {
    // Fetch product information
    const product = await Product.aggregate([
      {
        $match: {
          _id: mongoose.Types.ObjectId.createFromHexString(productId),
        },
      },
      {
        $lookup: {
          from: "inventories",
          localField: "_id",
          foreignField: "product_id",
          as: "inventoryDetails",
        },
      },
      {
        $unwind: "$inventoryDetails",
      },
      {
        $project: {
          name: 1,
          description: 1,
          unit_cost: 1,
          features: 1,
          images: 1,
          reserved_quantity: "$inventoryDetails.reserved_quantity",
          available_quantity: "$inventoryDetails.available_quantity",
        },
      },
    ]);

    if (product.length === 0) {
      return {
        success: false,
        message: "Product not found",
        statusCode: 404,
      };
    }

    // Fetch full order history
    const orders = await Order.aggregate([
      {
        $match: {
          "order_items.product_id":
            mongoose.Types.ObjectId.createFromHexString(productId),
          isDeleted: false,
        },
      },
      {
        $unwind: "$order_items",
      },
      {
        $match: {
          "order_items.product_id":
            mongoose.Types.ObjectId.createFromHexString(productId),
        },
      },
      {
        $lookup: {
          from: "payments",
          localField: "booking_id",
          foreignField: "booking_id",
          as: "payments",
        },
      },
      {
        $addFields: {
          total_amount_paid: {
            $sum: "$payments.amount",
          },
        },
      },
      {
        $project: {
          order_id: 1,
          order_date: 1,
          dispatch_items: 1,
          total_amount: 1,
          amount_paid: 1,
          status: 1,
          order_items: 1,
          user_id: 1,
          address: 1,
          from_date: 1,
          to_date: 1,
          from_time: 1,
          to_time: 1,
          discount: 1,
          sub_total: 1,
          createdAt: 1,
          total_amount_paid: 1,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);

    // Fetch booking history for the product, excluding those already converted to orders
    const bookings = await Booking.aggregate([
      {
        $match: {
          "booking_items.product_id":
            mongoose.Types.ObjectId.createFromHexString(productId),
          isDeleted: false,
        },
      },
      {
        $unwind: "$booking_items",
      },
      {
        $match: {
          "booking_items.product_id":
            mongoose.Types.ObjectId.createFromHexString(productId),
        },
      },
      {
        $lookup: {
          from: "orders",
          localField: "_id",
          foreignField: "booking_id",
          as: "order",
        },
      },
      {
        $match: {
          "order.0": { $exists: false },
        },
      },
      {
        $project: {
          booking_id: 1,
          booking_date: 1,
          from_date: 1,
          to_date: 1,
          from_time: 1,
          to_time: 1,
          no_of_days: 1,
          status: 1,
          booking_items: 1,
          user_id: 1,
          address: 1,
          total_amount: 1,
          amount_paid: 1,
          discount: 1,
          sub_total: 1,
          createdAt: 1,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);

    return {
      success: true,
      message:
        "Product, order, and non-converted booking history fetched successfully",
      data: {
        product: product[0],
        orders,
        bookings,
      },
      statusCode: 200,
    };
  } catch (error) {
    console.error(
      "Error fetching product orders and non-converted bookings history:",
      error
    );
    return {
      success: false,
      message: error.message || "Internal server error",
      statusCode: 500,
    };
  }
};
