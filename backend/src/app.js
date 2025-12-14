// src/app.js
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import authRoutes from "./routes/auth.routes.js";
import devicesRoutes from "./routes/devices.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import messageRoutes from "./routes/message.routes.js";
import callRoutes from "./routes/call.routes.js";
import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173", credentials: true }));

// api
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/devices", devicesRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/chats", chatRoutes);
app.use("/api/v1/messages", messageRoutes);
app.use("/api/v1/calls", callRoutes);

// health
app.get("/health", (req, res) => res.json({ ok: true, uptime: process.uptime() }));
// error handler (last)
app.use(errorHandler);

export default app;
