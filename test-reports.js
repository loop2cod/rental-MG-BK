// Simple test script to verify reports API endpoints
import mongoose from "mongoose";
import dotenv from "dotenv";
import { 
  getPurchaseReports, 
  getInventoryReports, 
  getSupplierReports, 
  getFinancialReports,
  getDashboardOverview 
} from "./src/controllers/reportsController.js";

dotenv.config();

// Mock request and response objects
const createMockReq = (query = {}) => ({
  query,
  user: { _id: 'test-user-id', role: 'admin' }
});

const createMockRes = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.data = data;
    return res;
  };
  return res;
};

// Test functions
const testPurchaseReports = async () => {
  console.log('\n🔍 Testing Purchase Reports...');
  try {
    const req = createMockReq({ startDate: '2024-01-01', endDate: '2024-12-31' });
    const res = createMockRes();
    
    await getPurchaseReports(req, res);
    
    if (res.statusCode && res.statusCode !== 200) {
      console.log('❌ Purchase Reports failed:', res.data?.message);
    } else if (res.data?.success) {
      console.log('✅ Purchase Reports working - Summary:', {
        totalBookings: res.data.data?.summary?.bookings?.totalBookings || 0,
        totalOrders: res.data.data?.summary?.orders?.totalOrders || 0,
        statusBreakdown: res.data.data?.statusBreakdown?.length || 0
      });
    } else {
      console.log('⚠️ Purchase Reports returned without error but no success flag');
    }
  } catch (error) {
    console.log('❌ Purchase Reports error:', error.message);
  }
};

const testInventoryReports = async () => {
  console.log('\n📦 Testing Inventory Reports...');
  try {
    const req = createMockReq({ categoryId: 'all' });
    const res = createMockRes();
    
    await getInventoryReports(req, res);
    
    if (res.statusCode && res.statusCode !== 200) {
      console.log('❌ Inventory Reports failed:', res.data?.message);
    } else if (res.data?.success) {
      console.log('✅ Inventory Reports working - Summary:', {
        totalProducts: res.data.data?.summary?.totalProducts || 0,
        totalStock: res.data.data?.summary?.totalStock || 0,
        totalValue: res.data.data?.summary?.totalValue || 0
      });
    } else {
      console.log('⚠️ Inventory Reports returned without error but no success flag');
    }
  } catch (error) {
    console.log('❌ Inventory Reports error:', error.message);
  }
};

const testSupplierReports = async () => {
  console.log('\n🏢 Testing Supplier Reports...');
  try {
    const req = createMockReq({ status: 'all' });
    const res = createMockRes();
    
    await getSupplierReports(req, res);
    
    if (res.statusCode && res.statusCode !== 200) {
      console.log('❌ Supplier Reports failed:', res.data?.message);
    } else if (res.data?.success) {
      console.log('✅ Supplier Reports working - Summary:', {
        totalSuppliers: res.data.data?.summary?.totalSuppliers || 0,
        activeSuppliers: res.data.data?.summary?.activeSuppliers || 0,
        suppliers: res.data.data?.suppliers?.length || 0
      });
    } else {
      console.log('⚠️ Supplier Reports returned without error but no success flag');
    }
  } catch (error) {
    console.log('❌ Supplier Reports error:', error.message);
  }
};

const testFinancialReports = async () => {
  console.log('\n💰 Testing Financial Reports...');
  try {
    const req = createMockReq({ startDate: '2024-01-01', endDate: '2024-12-31' });
    const res = createMockRes();
    
    await getFinancialReports(req, res);
    
    if (res.statusCode && res.statusCode !== 200) {
      console.log('❌ Financial Reports failed:', res.data?.message);
    } else if (res.data?.success) {
      console.log('✅ Financial Reports working - Summary:', {
        totalTransactions: res.data.data?.summary?.totalTransactions || 0,
        totalAmount: res.data.data?.summary?.totalAmount || 0,
        successfulPayments: res.data.data?.summary?.successfulPayments || 0
      });
    } else {
      console.log('⚠️ Financial Reports returned without error but no success flag');
    }
  } catch (error) {
    console.log('❌ Financial Reports error:', error.message);
  }
};

const testDashboardOverview = async () => {
  console.log('\n📊 Testing Dashboard Overview...');
  try {
    const req = createMockReq();
    const res = createMockRes();
    
    await getDashboardOverview(req, res);
    
    if (res.statusCode && res.statusCode !== 200) {
      console.log('❌ Dashboard Overview failed:', res.data?.message);
    } else if (res.data?.success) {
      console.log('✅ Dashboard Overview working - Summary:', {
        todayBookings: res.data.data?.today?.bookings || 0,
        todayOrders: res.data.data?.today?.orders || 0,
        todayRevenue: res.data.data?.today?.revenue || 0,
        totalBookings: res.data.data?.overall?.totalBookings || 0
      });
    } else {
      console.log('⚠️ Dashboard Overview returned without error but no success flag');
    }
  } catch (error) {
    console.log('❌ Dashboard Overview error:', error.message);
  }
};

// Main test runner
const runTests = async () => {
  console.log('🚀 Starting Reports API Tests...');
  console.log('Note: Tests run without database connection - checking logic and validation only');
  
  await testPurchaseReports();
  await testInventoryReports();
  await testSupplierReports();
  await testFinancialReports();
  await testDashboardOverview();
  
  console.log('\n✨ Test run completed!');
  console.log('📝 Next steps:');
  console.log('   1. Start your MongoDB database');
  console.log('   2. Start the backend server: npm start');
  console.log('   3. Test the endpoints with real data using frontend or API client');
  
  process.exit(0);
};

// Run tests
runTests().catch(error => {
  console.error('❌ Test runner error:', error);
  process.exit(1);
});