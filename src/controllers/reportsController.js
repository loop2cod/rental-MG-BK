import Booking from "../models/BookingSchema.js";
import Order from "../models/OrderSchema.js";
import Product from "../models/ProductSchema.js";
import Supplier from "../models/SupplierSchema.js";
import Inventory from "../models/InventorySchema.js";
import Payment from "../models/PaymentSchema.js";
import Category from "../models/CategorySchema.js";
import Purchase from "../models/PurchaseSchema.js";
import mongoose from "mongoose";

// Input validation helper
const validateDateRange = (startDate, endDate) => {
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error("Invalid date format. Please use YYYY-MM-DD format.");
    }
    
    if (start > end) {
      throw new Error("Start date cannot be after end date.");
    }
    
    // Limit date range to 2 years for performance
    const maxRange = 2 * 365 * 24 * 60 * 60 * 1000; // 2 years in ms
    if (end - start > maxRange) {
      throw new Error("Date range cannot exceed 2 years.");
    }
  }
};

// MongoDB ObjectId validation
const validateObjectId = (id, fieldName) => {
  if (id && id !== "all" && !mongoose.Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ${fieldName} ID format.`);
  }
};

// Safe aggregation helper with error handling
const safeAggregate = async (model, pipeline, defaultValue = []) => {
  try {
    const result = await model.aggregate(pipeline);
    return result || defaultValue;
  } catch (error) {
    console.error(`Aggregation error in ${model.modelName}:`, error);
    return defaultValue;
  }
};

// Purchase Reports - Admin-added purchases analysis
export const getPurchaseReports = async (req, res) => {
  try {
    const { startDate, endDate, status, groupBy = "month" } = req.query;

    // Input validation
    validateDateRange(startDate, endDate);

    if (status && !["pending", "received", "cancelled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be one of: pending, received, cancelled"
      });
    }

    if (groupBy && !["day", "week", "month"].includes(groupBy)) {
      return res.status(400).json({
        success: false,
        message: "Invalid groupBy parameter. Must be one of: day, week, month"
      });
    }

    // Build date filter
    let dateFilter = {};
    if (startDate || endDate) {
      const startDateTime = startDate ? new Date(startDate) : null;
      const endDateTime = endDate ? new Date(endDate + 'T23:59:59.999Z') : null; // Include full end date
      
      dateFilter.createdAt = {};
      if (startDateTime) dateFilter.createdAt.$gte = startDateTime;
      if (endDateTime) dateFilter.createdAt.$lte = endDateTime;
    }

    // Build status filter
    let statusFilter = {};
    if (status && status !== "all") {
      statusFilter.status = status;
    }

    const matchFilter = { 
      ...dateFilter, 
      ...statusFilter, 
      isDeleted: false 
    };

    // Get purchase statistics
    const purchaseStats = await safeAggregate(Purchase, [
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalPurchases: { $sum: 1 },
          totalAmount: { $sum: { $ifNull: ["$total_amount", 0] } },
          totalItems: { $sum: { $size: { $ifNull: ["$items", []] } } },
          avgPurchaseValue: { $avg: { $ifNull: ["$total_amount", 0] } },
          uniqueSuppliers: { $addToSet: "$supplier_name" }
        }
      },
      {
        $addFields: {
          supplierCount: { $size: "$uniqueSuppliers" }
        }
      }
    ]);

    // Get status breakdown
    const statusBreakdown = await Purchase.aggregate([
      { $match: { ...dateFilter, isDeleted: false } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: { $ifNull: ["$total_amount", 0] } }
        }
      }
    ]);

    // Get trending data by time period
    let groupByFormat;
    switch (groupBy) {
      case "day":
        groupByFormat = {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" }
        };
        break;
      case "week":
        groupByFormat = {
          year: { $year: "$createdAt" },
          week: { $week: "$createdAt" }
        };
        break;
      case "month":
      default:
        groupByFormat = {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" }
        };
    }

    const trendingData = await Purchase.aggregate([
      { $match: { ...dateFilter, isDeleted: false } },
      {
        $group: {
          _id: groupByFormat,
          totalPurchases: { $sum: 1 },
          totalAmount: { $sum: { $ifNull: ["$total_amount", 0] } },
          itemCount: { $sum: { $size: { $ifNull: ["$items", []] } } }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.week": 1 } }
    ]);

    // Get top products by purchase quantity and amount
    const topProducts = await Purchase.aggregate([
      { $match: { ...dateFilter, isDeleted: false } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product_name",
          productName: { $first: "$items.product_name" },
          totalQuantity: { $sum: "$items.quantity" },
          totalAmount: { $sum: "$items.total_price" },
          avgPrice: { $avg: "$items.unit_price" },
          purchaseCount: { $sum: 1 }
        }
      },
      { $sort: { totalAmount: -1 } },
      { $limit: 10 }
    ]);

    // Get top suppliers by purchase amount
    const topSuppliers = await Purchase.aggregate([
      { $match: { ...dateFilter, isDeleted: false } },
      {
        $group: {
          _id: "$supplier_name",
          supplierName: { $first: "$supplier_name" },
          supplierContact: { $first: "$supplier_contact" },
          totalPurchases: { $sum: 1 },
          totalAmount: { $sum: { $ifNull: ["$total_amount", 0] } },
          avgPurchaseValue: { $avg: { $ifNull: ["$total_amount", 0] } }
        }
      },
      { $sort: { totalAmount: -1 } },
      { $limit: 10 }
    ]);

    // Get recent transactions
    const recentTransactions = await Purchase.find(matchFilter)
      .populate("created_by", "name email")
      .sort({ createdAt: -1 })
      .limit(10)
      .select("supplier_name supplier_contact purchase_date invoice_number total_amount status items created_by createdAt");

    const response = {
      summary: purchaseStats[0] || {
        totalPurchases: 0,
        totalAmount: 0,
        totalItems: 0,
        avgPurchaseValue: 0,
        supplierCount: 0
      },
      statusBreakdown,
      trendingData,
      topProducts,
      topSuppliers,
      recentTransactions,
      dateRange: {
        startDate: startDate || null,
        endDate: endDate || null
      },
      generatedAt: new Date()
    };

    res.status(200).json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error("Purchase Reports Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate purchase reports",
      error: error.message
    });
  }
};

// Inventory Reports - Complete product and stock analysis
export const getInventoryReports = async (req, res) => {
  try {
    const { categoryId, lowStock, outOfStock } = req.query;
    
    // Input validation
    validateObjectId(categoryId, "category");
    
    const lowStockThreshold = parseInt(lowStock) || 10;
    
    if (lowStockThreshold < 0 || lowStockThreshold > 1000) {
      return res.status(400).json({
        success: false,
        message: "Low stock threshold must be between 0 and 1000"
      });
    }

    // Build filters
    let productFilter = { isDeleted: false };
    if (categoryId && categoryId !== "all") {
      productFilter.category_id = new mongoose.Types.ObjectId(categoryId);
    }

    // Get inventory summary
    const inventorySummary = await Inventory.aggregate([
      {
        $lookup: {
          from: "products",
          localField: "product_id",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: "$product" },
      { $match: { "product.isDeleted": false } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalStock: { $sum: "$quantity" },
          totalReserved: { $sum: "$reserved_quantity" },
          totalAvailable: { $sum: "$available_quantity" },
          lowStockItems: {
            $sum: {
              $cond: [{ $lte: ["$available_quantity", lowStockThreshold] }, 1, 0]
            }
          },
          outOfStockItems: {
            $sum: {
              $cond: [{ $eq: ["$available_quantity", 0] }, 1, 0]
            }
          },
          totalValue: {
            $sum: { $multiply: ["$quantity", "$product.unit_cost"] }
          }
        }
      }
    ]);

    // Get detailed product inventory
    const productInventory = await Inventory.aggregate([
      {
        $lookup: {
          from: "products",
          localField: "product_id",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: "$product" },
      {
        $match: {
          "product.isDeleted": false,
          ...(categoryId && categoryId !== "all" ? {
            "product.category_id": new mongoose.Types.ObjectId(categoryId)
          } : {})
        }
      },
      {
        $lookup: {
          from: "categories",
          localField: "product.category_id",
          foreignField: "_id",
          as: "category"
        }
      },
      {
        $addFields: {
          categoryName: { $arrayElemAt: ["$category.name", 0] },
          stockStatus: {
            $cond: [
              { $eq: ["$available_quantity", 0] }, 
              "Out of Stock",
              {
                $cond: [
                  { $lte: ["$available_quantity", lowStockThreshold] },
                  "Low Stock",
                  "In Stock"
                ]
              }
            ]
          },
          stockValue: { $multiply: ["$quantity", "$product.unit_cost"] }
        }
      },
      {
        $project: {
          productId: "$product._id",
          productName: "$product.name",
          productCode: "$product.code",
          categoryName: 1,
          unitCost: "$product.unit_cost",
          totalQuantity: "$quantity",
          reservedQuantity: "$reserved_quantity",
          availableQuantity: "$available_quantity",
          stockStatus: 1,
          stockValue: 1,
          updatedAt: 1
        }
      },
      { $sort: { availableQuantity: 1, productName: 1 } }
    ]);

    // Category wise breakdown
    const categoryBreakdown = await Inventory.aggregate([
      {
        $lookup: {
          from: "products",
          localField: "product_id",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: "$product" },
      { $match: { "product.isDeleted": false } },
      {
        $lookup: {
          from: "categories",
          localField: "product.category_id",
          foreignField: "_id",
          as: "category"
        }
      },
      {
        $group: {
          _id: "$product.category_id",
          categoryName: { $first: { $arrayElemAt: ["$category.name", 0] } },
          productCount: { $sum: 1 },
          totalStock: { $sum: "$quantity" },
          totalReserved: { $sum: "$reserved_quantity" },
          totalAvailable: { $sum: "$available_quantity" },
          totalValue: { $sum: { $multiply: ["$quantity", "$product.unit_cost"] } },
          lowStockCount: {
            $sum: {
              $cond: [{ $lte: ["$available_quantity", lowStockThreshold] }, 1, 0]
            }
          }
        }
      },
      { $sort: { totalValue: -1 } }
    ]);

    // Apply additional filters if requested
    let filteredInventory = productInventory;
    if (outOfStock === "true") {
      filteredInventory = productInventory.filter(item => item.availableQuantity === 0);
    } else if (lowStock === "true") {
      filteredInventory = productInventory.filter(item => item.availableQuantity <= lowStockThreshold && item.availableQuantity > 0);
    }

    const response = {
      summary: inventorySummary[0] || {
        totalProducts: 0,
        totalStock: 0,
        totalReserved: 0,
        totalAvailable: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        totalValue: 0
      },
      categoryBreakdown,
      productInventory: filteredInventory,
      filters: {
        categoryId: categoryId || "all",
        lowStockThreshold,
        showOutOfStock: outOfStock === "true",
        showLowStock: lowStock === "true"
      },
      generatedAt: new Date()
    };

    res.status(200).json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error("Inventory Reports Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate inventory reports",
      error: error.message
    });
  }
};

// Supplier Reports - Suppliers from purchase data with contact info
export const getSupplierReports = async (req, res) => {
  try {
    const { status } = req.query;

    // Build status filter (for purchases)
    let statusFilter = { isDeleted: false };
    if (status && status !== "all") {
      statusFilter.status = status;
    }

    // Get supplier information from purchase data
    const supplierData = await Purchase.aggregate([
      { $match: statusFilter },
      {
        $group: {
          _id: "$supplier_name",
          supplierName: { $first: "$supplier_name" },
          supplierContact: { $first: "$supplier_contact" },
          totalPurchases: { $sum: 1 },
          totalAmount: { $sum: { $ifNull: ["$total_amount", 0] } },
          avgPurchaseValue: { $avg: { $ifNull: ["$total_amount", 0] } },
          lastPurchaseDate: { $max: "$purchase_date" },
          firstPurchaseDate: { $min: "$purchase_date" },
          statuses: { $addToSet: "$status" },
          invoiceNumbers: { $addToSet: "$invoice_number" }
        }
      },
      {
        $addFields: {
          hasContact: {
            $cond: [
              { $and: [
                { $ne: ["$supplierContact", null] },
                { $ne: ["$supplierContact", ""] }
              ]},
              true,
              false
            ]
          },
          isActive: {
            $cond: [
              { $gte: ["$lastPurchaseDate", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)] },
              true,
              false
            ]
          }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    // Get supplier summary stats
    const supplierSummary = await Purchase.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: null,
          totalSuppliers: { $addToSet: "$supplier_name" },
          totalPurchases: { $sum: 1 },
          totalAmount: { $sum: { $ifNull: ["$total_amount", 0] } },
          suppliersWithContact: {
            $addToSet: {
              $cond: [
                { $and: [
                  { $ne: ["$supplier_contact", null] },
                  { $ne: ["$supplier_contact", ""] }
                ]},
                "$supplier_name",
                null
              ]
            }
          },
          avgPurchaseValue: { $avg: { $ifNull: ["$total_amount", 0] } }
        }
      },
      {
        $addFields: {
          uniqueSuppliers: { $size: "$totalSuppliers" },
          suppliersWithContactCount: {
            $size: {
              $filter: {
                input: "$suppliersWithContact",
                cond: { $ne: ["$$this", null] }
              }
            }
          }
        }
      }
    ]);

    // Get purchase status breakdown by supplier
    const statusBreakdown = await Purchase.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: { $ifNull: ["$total_amount", 0] } },
          uniqueSuppliers: { $addToSet: "$supplier_name" }
        }
      },
      {
        $addFields: {
          supplierCount: { $size: "$uniqueSuppliers" }
        }
      }
    ]);

    // Get recently active suppliers (those with recent purchases)
    const recentSuppliers = await Purchase.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: "$supplier_name",
          supplierName: { $first: "$supplier_name" },
          supplierContact: { $first: "$supplier_contact" },
          lastPurchaseDate: { $max: "$purchase_date" },
          lastPurchaseAmount: { $last: "$total_amount" },
          recentPurchaseCount: { $sum: 1 }
        }
      },
      { $sort: { lastPurchaseDate: -1 } },
      { $limit: 10 }
    ]);

    // Contact information summary
    const contactStats = {
      withContact: supplierData.filter(s => s.hasContact).length,
      withoutContact: supplierData.filter(s => !s.hasContact).length,
      activeSuppliers: supplierData.filter(s => s.isActive).length,
      inactiveSuppliers: supplierData.filter(s => !s.isActive).length
    };

    const response = {
      summary: {
        ...(supplierSummary[0] || {
          uniqueSuppliers: 0,
          totalPurchases: 0,
          totalAmount: 0,
          suppliersWithContactCount: 0,
          avgPurchaseValue: 0
        }),
        contactStats
      },
      suppliers: supplierData,
      statusBreakdown,
      recentSuppliers,
      filters: {
        status: status || "all"
      },
      generatedAt: new Date()
    };

    res.status(200).json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error("Supplier Reports Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate supplier reports",
      error: error.message
    });
  }
};

// Financial Reports - Payment and revenue analysis
export const getFinancialReports = async (req, res) => {
  try {
    const { startDate, endDate, paymentMethod, stage } = req.query;

    // Build date filter
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.payment_date = {};
      if (startDate) dateFilter.payment_date.$gte = new Date(startDate);
      if (endDate) dateFilter.payment_date.$lte = new Date(endDate);
    }

    // Build additional filters
    let additionalFilters = { isDeleted: false };
    if (paymentMethod && paymentMethod !== "all") {
      additionalFilters.payment_method = paymentMethod;
    }
    if (stage && stage !== "all") {
      additionalFilters.stage = stage;
    }

    const matchFilter = { ...dateFilter, ...additionalFilters };

    // Get payment summary
    const paymentSummary = await Payment.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          totalCredit: {
            $sum: {
              $cond: [{ $eq: ["$transaction_type", "credit"] }, "$amount", 0]
            }
          },
          totalDebit: {
            $sum: {
              $cond: [{ $eq: ["$transaction_type", "debit"] }, "$amount", 0]
            }
          },
          successfulPayments: {
            $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] }
          },
          failedPayments: {
            $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] }
          },
          refundedAmount: {
            $sum: {
              $cond: [{ $eq: ["$status", "refunded"] }, "$amount", 0]
            }
          }
        }
      }
    ]);

    // Payment method breakdown
    const paymentMethodBreakdown = await Payment.aggregate([
      { $match: { ...dateFilter, isDeleted: false } },
      {
        $group: {
          _id: "$payment_method",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          successCount: {
            $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] }
          }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    // Status breakdown
    const statusBreakdown = await Payment.aggregate([
      { $match: { ...dateFilter, isDeleted: false } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" }
        }
      }
    ]);

    // Stage breakdown
    const stageBreakdown = await Payment.aggregate([
      { $match: { ...dateFilter, isDeleted: false } },
      {
        $group: {
          _id: "$stage",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" }
        }
      }
    ]);

    // Daily revenue trend
    const dailyRevenue = await Payment.aggregate([
      { $match: { ...dateFilter, status: "success", isDeleted: false } },
      {
        $group: {
          _id: {
            year: { $year: "$payment_date" },
            month: { $month: "$payment_date" },
            day: { $dayOfMonth: "$payment_date" }
          },
          totalRevenue: { $sum: "$amount" },
          transactionCount: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
    ]);

    const response = {
      summary: paymentSummary[0] || {
        totalTransactions: 0,
        totalAmount: 0,
        totalCredit: 0,
        totalDebit: 0,
        successfulPayments: 0,
        failedPayments: 0,
        refundedAmount: 0
      },
      paymentMethodBreakdown,
      statusBreakdown,
      stageBreakdown,
      dailyRevenue,
      filters: {
        startDate: startDate || null,
        endDate: endDate || null,
        paymentMethod: paymentMethod || "all",
        stage: stage || "all"
      },
      generatedAt: new Date()
    };

    res.status(200).json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error("Financial Reports Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate financial reports",
      error: error.message
    });
  }
};

// Dashboard Overview - Key metrics for admin dashboard
export const getDashboardOverview = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Today's metrics
    const todayMetrics = await Promise.all([
      // Bookings today
      Booking.countDocuments({
        createdAt: { $gte: startOfDay, $lte: endOfDay },
        isDeleted: false
      }),
      // Orders today
      Order.countDocuments({
        createdAt: { $gte: startOfDay, $lte: endOfDay },
        isDeleted: false
      }),
      // Revenue today
      Payment.aggregate([
        {
          $match: {
            payment_date: { $gte: startOfDay, $lte: endOfDay },
            status: "success",
            isDeleted: false
          }
        },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ])
    ]);

    // Monthly metrics
    const monthlyMetrics = await Promise.all([
      // Bookings this month
      Booking.countDocuments({
        createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        isDeleted: false
      }),
      // Orders this month
      Order.countDocuments({
        createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        isDeleted: false
      }),
      // Revenue this month
      Payment.aggregate([
        {
          $match: {
            payment_date: { $gte: startOfMonth, $lte: endOfMonth },
            status: "success",
            isDeleted: false
          }
        },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ])
    ]);

    // Overall totals
    const overallMetrics = await Promise.all([
      Booking.countDocuments({ isDeleted: false }),
      Order.countDocuments({ isDeleted: false }),
      Product.countDocuments({ isDeleted: false }),
      Supplier.countDocuments({ isDeleted: false }),
      Inventory.aggregate([
        { $group: { _id: null, totalStock: { $sum: "$quantity" } } }
      ])
    ]);

    const response = {
      today: {
        bookings: todayMetrics[0],
        orders: todayMetrics[1],
        revenue: todayMetrics[2][0]?.total || 0
      },
      thisMonth: {
        bookings: monthlyMetrics[0],
        orders: monthlyMetrics[1],
        revenue: monthlyMetrics[2][0]?.total || 0
      },
      overall: {
        totalBookings: overallMetrics[0],
        totalOrders: overallMetrics[1],
        totalProducts: overallMetrics[2],
        totalSuppliers: overallMetrics[3],
        totalStock: overallMetrics[4][0]?.totalStock || 0
      },
      generatedAt: new Date()
    };

    res.status(200).json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error("Dashboard Overview Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate dashboard overview",
      error: error.message
    });
  }
};