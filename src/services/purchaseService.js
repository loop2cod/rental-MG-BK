import Purchase from "../models/PurchaseSchema.js";

export const createPurchase = async (purchaseData, userId) => {
  try {
    const purchase = new Purchase({
      ...purchaseData,
      created_by: userId,
    });

    await purchase.save();

    return {
      success: true,
      message: "Purchase created successfully",
      statusCode: 201,
      data: {
        purchase: {
          id: purchase._id,
          supplier_name: purchase.supplier_name,
          total_amount: purchase.total_amount,
          purchase_date: purchase.purchase_date,
          status: purchase.status,
        }
      }
    };
  } catch (error) {
    console.log("createPurchase error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};

export const getAllPurchases = async (page = 1, limit = 10, search = "", filters = {}) => {
  try {
    const skip = (page - 1) * limit;
    
    // Build search query
    let searchQuery = {
      isDeleted: { $ne: true }
    };

    // Add search functionality
    if (search) {
      searchQuery.$or = [
        { supplier_name: { $regex: search, $options: "i" } },
        { invoice_number: { $regex: search, $options: "i" } },
        { "items.product_name": { $regex: search, $options: "i" } }
      ];
    }

    // Add filters
    if (filters.supplier && filters.supplier !== 'all') {
      searchQuery.supplier_name = { $regex: filters.supplier, $options: "i" };
    }

    if (filters.status && filters.status !== 'all') {
      searchQuery.status = filters.status;
    }

    if (filters.dateFrom || filters.dateTo) {
      searchQuery.purchase_date = {};
      if (filters.dateFrom) {
        searchQuery.purchase_date.$gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        const endDate = new Date(filters.dateTo);
        endDate.setHours(23, 59, 59, 999); // End of day
        searchQuery.purchase_date.$lte = endDate;
      }
    }

    const [purchases, totalCount] = await Promise.all([
      Purchase.find(searchQuery)
        .populate("created_by", "name")
        .sort({ purchase_date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Purchase.countDocuments(searchQuery)
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      success: true,
      message: "Purchases retrieved successfully",
      statusCode: 200,
      data: {
        purchases,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: totalCount,
          itemsPerPage: limit,
        }
      }
    };
  } catch (error) {
    console.log("getAllPurchases error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};

export const getPurchaseById = async (purchaseId) => {
  try {
    const purchase = await Purchase.findById(purchaseId)
      .populate("created_by", "name")
      .where({ isDeleted: { $ne: true } });

    if (!purchase) {
      return {
        success: false,
        message: "Purchase not found",
        statusCode: 404,
      };
    }

    return {
      success: true,
      message: "Purchase retrieved successfully",
      statusCode: 200,
      data: { purchase }
    };
  } catch (error) {
    console.log("getPurchaseById error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};

export const updatePurchaseStatus = async (purchaseId, status) => {
  try {
    const validStatuses = ["pending", "received", "cancelled"];
    if (!validStatuses.includes(status)) {
      return {
        success: false,
        message: "Invalid status",
        statusCode: 400,
      };
    }

    const purchase = await Purchase.findByIdAndUpdate(
      purchaseId,
      { status },
      { new: true }
    ).where({ isDeleted: { $ne: true } });

    if (!purchase) {
      return {
        success: false,
        message: "Purchase not found",
        statusCode: 404,
      };
    }

    return {
      success: true,
      message: "Purchase status updated successfully",
      statusCode: 200,
      data: { purchase }
    };
  } catch (error) {
    console.log("updatePurchaseStatus error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};

export const deletePurchase = async (purchaseId) => {
  try {
    const purchase = await Purchase.findByIdAndUpdate(
      purchaseId,
      { isDeleted: true },
      { new: true }
    );

    if (!purchase) {
      return {
        success: false,
        message: "Purchase not found",
        statusCode: 404,
      };
    }

    return {
      success: true,
      message: "Purchase deleted successfully",
      statusCode: 200,
    };
  } catch (error) {
    console.log("deletePurchase error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};

export const createBulkPurchases = async (purchasesData, userId) => {
  try {
    const results = {
      successful: [],
      failed: [],
      total: purchasesData.length
    };

    for (let i = 0; i < purchasesData.length; i++) {
      try {
        const purchaseData = purchasesData[i];
        
        // Validate required fields
        if (!purchaseData.supplier_name || !purchaseData.items || purchaseData.items.length === 0) {
          results.failed.push({
            row: i + 2, // +2 because Excel rows start at 1 and we skip header
            error: "Missing supplier name or items",
            data: purchaseData
          });
          continue;
        }

        // Calculate total amount
        const total_amount = purchaseData.items.reduce((sum, item) => sum + (item.total_price || 0), 0);

        const purchase = new Purchase({
          supplier_name: purchaseData.supplier_name,
          supplier_contact: purchaseData.supplier_contact || "",
          purchase_date: purchaseData.purchase_date || new Date(),
          invoice_number: purchaseData.invoice_number || "",
          items: purchaseData.items,
          total_amount,
          notes: purchaseData.notes || "",
          created_by: userId,
        });

        await purchase.save();
        results.successful.push({
          row: i + 2,
          id: purchase._id,
          supplier: purchase.supplier_name
        });

      } catch (error) {
        results.failed.push({
          row: i + 2,
          error: error.message,
          data: purchasesData[i]
        });
      }
    }

    return {
      success: true,
      message: `Bulk upload completed. ${results.successful.length} purchases created, ${results.failed.length} failed.`,
      statusCode: 200,
      data: results
    };

  } catch (error) {
    console.log("createBulkPurchases error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};

// Purchase Reporting Functions
export const getPurchaseReports = async (filters = {}) => {
  try {
    // Build search query
    let searchQuery = {
      isDeleted: { $ne: true }
    };

    // Add filters
    if (filters.supplier && filters.supplier !== 'all') {
      searchQuery.supplier_name = { $regex: filters.supplier, $options: "i" };
    }

    if (filters.status && filters.status !== 'all') {
      searchQuery.status = filters.status;
    }

    if (filters.dateFrom || filters.dateTo) {
      searchQuery.purchase_date = {};
      if (filters.dateFrom) {
        searchQuery.purchase_date.$gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        const endDate = new Date(filters.dateTo);
        endDate.setHours(23, 59, 59, 999);
        searchQuery.purchase_date.$lte = endDate;
      }
    }

    const [purchases, totalCount, summaryStats] = await Promise.all([
      Purchase.find(searchQuery)
        .populate("created_by", "name")
        .sort({ purchase_date: -1 }),
      Purchase.countDocuments(searchQuery),
      Purchase.aggregate([
        { $match: searchQuery },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$total_amount" },
            totalPurchases: { $sum: 1 },
            avgAmount: { $avg: "$total_amount" },
            pendingCount: {
              $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] }
            },
            receivedCount: {
              $sum: { $cond: [{ $eq: ["$status", "received"] }, 1, 0] }
            },
            cancelledCount: {
              $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] }
            }
          }
        }
      ])
    ]);

    // Supplier-wise summary
    const supplierStats = await Purchase.aggregate([
      { $match: searchQuery },
      {
        $group: {
          _id: "$supplier_name",
          totalAmount: { $sum: "$total_amount" },
          purchaseCount: { $sum: 1 },
          avgAmount: { $avg: "$total_amount" },
          lastPurchase: { $max: "$purchase_date" }
        }
      },
      { $sort: { totalAmount: -1 } },
      { $limit: 10 }
    ]);

    // Monthly trends
    const monthlyTrends = await Purchase.aggregate([
      { $match: searchQuery },
      {
        $group: {
          _id: {
            year: { $year: "$purchase_date" },
            month: { $month: "$purchase_date" }
          },
          totalAmount: { $sum: "$total_amount" },
          purchaseCount: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      { $limit: 12 }
    ]);

    return {
      success: true,
      message: "Purchase reports generated successfully",
      statusCode: 200,
      data: {
        purchases,
        summary: summaryStats[0] || {
          totalAmount: 0,
          totalPurchases: 0,
          avgAmount: 0,
          pendingCount: 0,
          receivedCount: 0,
          cancelledCount: 0
        },
        supplierStats,
        monthlyTrends,
        totalRecords: totalCount
      }
    };
  } catch (error) {
    console.log("getPurchaseReports error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};

export const getPurchaseSummary = async () => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    const [currentMonth, currentYear, previousMonth, allTime] = await Promise.all([
      Purchase.aggregate([
        {
          $match: {
            isDeleted: { $ne: true },
            purchase_date: { $gte: startOfMonth }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$total_amount" },
            totalCount: { $sum: 1 }
          }
        }
      ]),
      Purchase.aggregate([
        {
          $match: {
            isDeleted: { $ne: true },
            purchase_date: { $gte: startOfYear }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$total_amount" },
            totalCount: { $sum: 1 }
          }
        }
      ]),
      Purchase.aggregate([
        {
          $match: {
            isDeleted: { $ne: true },
            purchase_date: { $gte: lastMonth, $lte: endOfLastMonth }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$total_amount" },
            totalCount: { $sum: 1 }
          }
        }
      ]),
      Purchase.aggregate([
        {
          $match: {
            isDeleted: { $ne: true }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$total_amount" },
            totalCount: { $sum: 1 }
          }
        }
      ])
    ]);

    // Calculate growth
    const currentMonthAmount = currentMonth[0]?.totalAmount || 0;
    const previousMonthAmount = previousMonth[0]?.totalAmount || 0;
    const monthlyGrowth = previousMonthAmount > 0 
      ? ((currentMonthAmount - previousMonthAmount) / previousMonthAmount) * 100 
      : 0;

    return {
      success: true,
      message: "Purchase summary retrieved successfully",
      statusCode: 200,
      data: {
        currentMonth: currentMonth[0] || { totalAmount: 0, totalCount: 0 },
        currentYear: currentYear[0] || { totalAmount: 0, totalCount: 0 },
        previousMonth: previousMonth[0] || { totalAmount: 0, totalCount: 0 },
        allTime: allTime[0] || { totalAmount: 0, totalCount: 0 },
        monthlyGrowth: monthlyGrowth.toFixed(2)
      }
    };
  } catch (error) {
    console.log("getPurchaseSummary error => ", error);
    return {
      success: false,
      message: "Internal server error",
      statusCode: 500,
    };
  }
};