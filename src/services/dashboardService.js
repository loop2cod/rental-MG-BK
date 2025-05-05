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
    // Recent Bookings
    const recentBookings = await Booking.find({})
      .sort({ booking_date: -1 })
      .limit(10)
      .populate({
        path: "user_id",
        select: "name",
      })
      .select("user_id booking_date status total_amount");

    const formattedRecentBookings = recentBookings.map((booking) => ({
      id: booking._id,
      user: booking.user_id ? booking.user_id.name : "Unknown User",
      date: booking.booking_date.toISOString().split("T")[0],
      status: booking.status,
      amount: booking.total_amount,
    }));

    return {
      success: true,
      message: "Recent bookings fetched successfully",
      data: formattedRecentBookings,
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
