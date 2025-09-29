import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import connectDB from "./src/config/dbConnect.js";
import authRoutes from "./src/routes/authRoutes.js";
import inventoryRoutes from "./src/routes/inventoryRoutes.js";
import categoryRoutes from "./src/routes/categoryRoutes.js";
import supplierRoutes from "./src/routes/supplierRoutes.js";
import bookingRoutes from "./src/routes/bookingRoutes.js";
import orderRoutes from "./src/routes/orderRoutes.js";
import paymentRoutes from "./src/routes/paymentRoutes.js";
import cookieParser from "cookie-parser";
import dashboardRoutes from "./src/routes/dashboardRoutes.js";
import fileHandleRoutes from "./src/routes/fileHandleRoute.js";
import adminRoutes from "./src/routes/adminRoutes.js";
import purchaseRoutes from "./src/routes/purchaseRoutes.js";
import reportsRoutes from "./src/routes/reportsRoutes.js";

dotenv.config();
connectDB();

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: [process.env.ALLOWED_ORIGIN1, process.env.ALLOWED_ORIGIN2, process.env.ALLOWED_ORIGIN3],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(helmet());
app.use(morgan("dev"));

// app.use(formidable());

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/inventory", inventoryRoutes);
app.use("/api/v1/category", categoryRoutes);
app.use("/api/v1/supplier", supplierRoutes);
app.use("/api/v1/booking", bookingRoutes);
app.use("/api/v1/order", orderRoutes);
app.use("/api/v1/payment", paymentRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/file", fileHandleRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/purchase", purchaseRoutes);
app.use("/api/v1/reports", reportsRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export default app;
