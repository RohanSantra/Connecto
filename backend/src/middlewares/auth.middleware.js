// src/middlewares/auth.middleware.js
import ApiError from "../utils/ApiError.js";
import { verifyAccessToken } from "../utils/token.js";
import User from "../models/user.model.js";
import Session from "../models/session.model.js";

export const authMiddleware = async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.headers.authorization?.split(" ")[1];

    if (!token) throw new ApiError(401, "Unauthorized");

    const decoded = verifyAccessToken(token);
    if (!decoded?.userId) throw new ApiError(401, "Invalid token");

    // 🔑 THIS IS THE MISSING PIECE
    const deviceId = req.headers["x-device-id"];
    if (!deviceId) throw new ApiError(401, "Device missing");

    const session = await Session.findOne({
      userId: decoded.userId,
      deviceId,
      revoked: false,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      throw new ApiError(401, "Session revoked");
    }

    const user = await User.findById(decoded.userId).lean();
    if (!user) throw new ApiError(401, "User not found");

    req.user = user;
    req.deviceId = deviceId;
    next();
  } catch (err) {
    next(err);
  }
};
