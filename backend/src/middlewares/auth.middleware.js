// src/middlewares/auth.middleware.js
import cookie from "cookie";
import ApiError from "../utils/ApiError.js";
import { verifyAccessToken } from "../utils/token.js";
import User from "../models/user.model.js";

export const authMiddleware = async (req, res, next) => {
  try {
    // token from cookie or authorization header
    const token = req.cookies?.accessToken || (req.headers.authorization?.split(" ")[1]) || null;

    if (!token) throw new ApiError(401, "Unauthorized: token missing");

    const decoded = verifyAccessToken(token);
    if (!decoded?.userId) throw new ApiError(401, "Unauthorized: invalid token");

    const user = await User.findById(decoded.userId).lean();
    if (!user) throw new ApiError(401, "Unauthorized: user not found");

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};
