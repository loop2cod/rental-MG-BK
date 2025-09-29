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

export const getAllPurchases = async (page = 1, limit = 10, search = "") => {
  try {
    const skip = (page - 1) * limit;
    
    const searchQuery = {
      isDeleted: { $ne: true },
      ...(search && {
        $or: [
          { supplier_name: { $regex: search, $options: "i" } },
          { invoice_number: { $regex: search, $options: "i" } },
          { "items.product_name": { $regex: search, $options: "i" } }
        ]
      })
    };

    const [purchases, totalCount] = await Promise.all([
      Purchase.find(searchQuery)
        .populate("created_by", "name")
        .sort({ createdAt: -1 })
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