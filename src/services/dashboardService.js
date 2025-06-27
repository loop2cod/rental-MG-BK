import Booking from "../models/BookingSchema.js";
import Order from "../models/OrderSchema.js";
import Inventory from "../models/InventorySchema.js";
import Notification from "../models/NotificationSchema.js";

export const getDashboardData = async () => {
  try {
    // 3. Total Revenue and Percentage Change
    const currentDate = new Date();
    const currentMonthStart = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );
    const lastMonthStart = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 1,
      1
    );
    const lastMonthEnd = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      0
    );

    const [currentMonthRevenue, lastMonthRevenue] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            order_date: { $gte: currentMonthStart, $lte: currentDate },
            status: "Success", // Consider only successful orders for revenue
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$total_amount" },
          },
        },
      ]),
      Order.aggregate([
        {
          $match: {
            order_date: { $gte: lastMonthStart, $lte: lastMonthEnd },
            status: "Success", // Consistent filtering for accurate comparison
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$total_amount" },
          },
        },
      ]),
    ]);

    const totalRevenue = currentMonthRevenue[0]?.totalRevenue || 0;
    const previousMonthRevenue = lastMonthRevenue[0]?.totalRevenue || 0;
    const revenueChange =
      previousMonthRevenue !== 0
        ? ((totalRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
        : 0;

    // 4. Pre-Bookings and Confirmed Bookings Statistics
    const [
      currentMonthPreBookings,
      currentMonthConfirmedBookings,
      lastMonthPreBookings,
      lastMonthConfirmedBookings,
    ] = await Promise.all([
      Booking.countDocuments({
        booking_date: { $gte: currentMonthStart, $lte: currentDate },
        status: "Pending",
      }),
      Booking.countDocuments({
        booking_date: { $gte: currentMonthStart, $lte: currentDate },
        status: "Success",
      }),
      Booking.countDocuments({
        booking_date: { $gte: lastMonthStart, $lte: lastMonthEnd },
        status: "Pending",
      }),
      Booking.countDocuments({
        booking_date: { $gte: lastMonthStart, $lte: lastMonthEnd },
        status: "Success",
      }),
    ]);

    const preBookingChange =
      lastMonthPreBookings !== 0
        ? ((currentMonthPreBookings - lastMonthPreBookings) /
            lastMonthPreBookings) *
          100
        : 0;
    const confirmedBookingChange =
      lastMonthConfirmedBookings !== 0
        ? ((currentMonthConfirmedBookings - lastMonthConfirmedBookings) /
            lastMonthConfirmedBookings) *
          100
        : 0;

    // 5. Total Quantity of All Products
    const totalQuantityResult = await Inventory.aggregate([
      {
        $match: { isDeleted: false },
      },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: "$quantity" },
        },
      },
    ]);

    const totalQuantity =
      totalQuantityResult.length > 0 ? totalQuantityResult[0].totalQuantity : 0;

    return {
      success: true,
      message: "Dashboard data fetched successfully",
      data: {
        totalRevenue: totalRevenue,
        revenueChange: revenueChange,
        preBookings: currentMonthPreBookings,
        preBookingChange: preBookingChange,
        confirmedBookings: currentMonthConfirmedBookings,
        confirmedBookingChange: confirmedBookingChange,
        totalQuantity: totalQuantity,
      },
      statusCode: 200,
    };
  } catch (error) {
    console.error("getDashboardData error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};

export const getChartData = async () => {
  try {
    // 1. Chart Data (Monthly Bookings)
    const chartData = await Booking.aggregate([
      {
        $group: {
          _id: { $month: "$booking_date" },
          preBooking: {
            $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] },
          },
          confirmed: {
            $sum: { $cond: [{ $eq: ["$status", "Success"] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          month: "$_id",
          preBooking: 1,
          confirmed: 1,
        },
      },
      {
        $sort: { month: 1 },
      },
    ]);

    // Map month numbers to month names
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const formattedChartData = monthNames.map((month, index) => {
      const monthData = chartData.find((data) => data.month === index + 1) || {
        preBooking: 0,
        confirmed: 0,
      };
      return {
        name: month,
        preBooking: monthData.preBooking,
        confirmed: monthData.confirmed,
      };
    });

    return {
      success: true,
      message: "Chart data fetched successfully",
      data: formattedChartData,
      statusCode: 200,
    };
  } catch (error) {
    console.error("getChartData error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};

export const getRecentBookings = async () => {
  try {
    // Get today's date range (12:00 AM to 11:59 PM)
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    // Get today's orders
    const todaysOrders = await Order.find({
      from_date: { $gte: startOfDay, $lte: endOfDay },
      isDeleted: false
    })
      .sort({ from_date: -1 })
      .populate({
        path: "user_id",
        select: "name mobile",
      })
      .populate({
        path: "booking_id",
        select: "booking_date"
      })
      .select({
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
        from_date: 1,
        to_date: 1,
        no_of_days: 1,
        total_amount: 1,
        amount_paid: 1,
        total_quantity: 1
      });

    // Get booking IDs that are already present in orders
    const bookingIdsInOrders = todaysOrders
      .filter(order => order.booking_id)
      .map(order => order.booking_id);

    // Get today's bookings excluding those that are already converted to orders
    const todaysBookings = await Booking.find({
      from_date: { $gte: startOfDay, $lte: endOfDay },
      isDeleted: false,
      _id: { $nin: bookingIdsInOrders } // Exclude bookings that are already in orders
    })
      .sort({ from_date: -1 })
      .populate({
        path: "user_id",
        select: "name mobile",
      })
      .select({
        _id: 1,
        booking_id: 1,
        user_id: 1,
        booking_items: 1,
        outsourced_items: 1,
        address: 1,
        status: 1,
        from_time: 1,
        to_time: 1,
        booking_date: 1,
        from_date: 1,
        to_date: 1,
        no_of_days: 1,
        total_amount: 1,
        amount_paid: 1,
        total_quantity: 1
      });

    // Format today's orders
    const formattedTodaysOrders = todaysOrders.map((order) => ({
      _id: order._id,
      order_id: order.order_id,
      user_id: order.user_id?._id || null,
      booking_id: order.booking_id?._id || null,
      order_items: order.order_items,
      outsourced_items: order.outsourced_items,
      address: order.address,
      status: order.status,
      from_time: order.from_time,
      to_time: order.to_time,
      order_date: order.order_date,
      booking_date: order.booking_id?.booking_date || null,
      from_date: order.from_date,
      to_date: order.to_date,
      no_of_days: order.no_of_days,
      total_amount: order.total_amount,
      amount_paid: order.amount_paid,
      total_quantity: order.total_quantity,
      total_amount_paid: order.amount_paid, // Using amount_paid as total_amount_paid
      user: {
        name: order.user_id?.name || "Unknown User",
        mobile: order.user_id?.mobile || "N/A"
      },
      type: "order" // Flag to identify as order
    }));

    // Format today's bookings
    const formattedTodaysBookings = todaysBookings.map((booking) => ({
      _id: booking._id,
      order_id: booking.booking_id, // Using booking_id as order_id for consistency
      user_id: booking.user_id?._id || null,
      booking_id: booking._id,
      order_items: booking.booking_items, // Using booking_items as order_items
      outsourced_items: booking.outsourced_items,
      address: booking.address,
      status: booking.status,
      from_time: booking.from_time,
      to_time: booking.to_time,
      order_date: booking.booking_date, // Using booking_date as order_date
      booking_date: booking.booking_date,
      from_date: booking.from_date,
      to_date: booking.to_date,
      no_of_days: booking.no_of_days,
      total_amount: booking.total_amount,
      amount_paid: booking.amount_paid,
      total_quantity: booking.total_quantity,
      total_amount_paid: booking.amount_paid, // Using amount_paid as total_amount_paid
      user: {
        name: booking.user_id?.name || "Unknown User",
        mobile: booking.user_id?.mobile || "N/A"
      },
      type: "booking" // Flag to identify as booking
    }));

    // Combine orders and bookings
    const combinedData = [...formattedTodaysOrders, ...formattedTodaysBookings];

    // Sort combined data by date (most recent first)
    combinedData.sort((a, b) => {
      const dateA = new Date(a.type === 'order' ? a.order_date : a.booking_date);
      const dateB = new Date(b.type === 'order' ? b.order_date : b.booking_date);
      return dateB - dateA;
    });

    return {
      success: true,
      message: "Today's orders and bookings fetched successfully",
      data: combinedData,
      statusCode: 200,
    };
  } catch (error) {
    console.error("getRecentBookings error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};

export const getNotifications = async () => {
  try {
    const notifications = await Notification.find({}).sort({ createdAt: -1 });

    const formattedNotifications = notifications.map((notification) => ({
      id: notification._id,
      message: notification.message,
      type: notification.type || "default",
      createdAt: notification.createdAt
    }));

    return {
      success: true,
      message: "Notifications fetched successfully",
      data: formattedNotifications,
      statusCode: 200,
    };
  } catch (error) {
    console.error("getNotifications error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};

export const deleteSingleNotification = async (id) => {
  try {
    const notification = await Notification.findById(id);
    if (!notification) {
      return {
        success: false,
        message: "Notification not found",
        statusCode: 404,
      };
    }

    await notification.deleteOne();

    return {
      success: true,
      message: "Notification deleted",
      statusCode: 200,
    };
  } catch (error) {
    console.error("deleteSingleNotification error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};

export const deleteAllNotifications = async () => {
  try {
    const notifications = await Notification.find({});
    if (!notifications) {
      return {
        success: false,
        message: "No notifications found",
        statusCode: 404,
      };
    }

    await Notification.deleteMany({});

    return {
      success: true,
      message: "All notifications deleted",
      statusCode: 200,
    };
  } catch (error) {
    console.error("deleteAllNotifications error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};
