// src/utils/token.utils.js
import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET;

/* ==========================================================
   🔹 ACCESS TOKENS (short-lived, JWT-based)
   ========================================================== */

/**
 * Generates an access token (JWT) tied to a specific user and optionally device.
 * @param {Object} payload - Payload containing at least { userId }
 * @param {String} expires - Expiration time (default 15m)
 */
export const generateAccessToken = (payload, expires = "15m") => {
    if (!payload?.userId) throw new Error("Missing userId in access token payload");
    return jwt.sign(payload, ACCESS_SECRET, { expiresIn: expires });
};

/**
 * Verifies a JWT access token safely and throws clear errors.
 * @param {String} token - JWT string
 */
export const verifyAccessToken = (token) => {
    try {
        return jwt.verify(token, ACCESS_SECRET);
    } catch (err) {
        if (err.name === "TokenExpiredError") throw new Error("Access token expired");
        if (err.name === "JsonWebTokenError") throw new Error("Invalid token");
        throw err;
    }
};

/* ==========================================================
   🔹 REFRESH TOKENS (opaque, random string hashed in DB)
   ========================================================== */

/**
 * Generate a cryptographically secure random refresh token.
 * Stored in DB as bcrypt hash for comparison.
 */
export const generateRefreshToken = () => {
    return crypto.randomBytes(48).toString("hex");
};

/**
 * Hash a token for DB storage.
 */
export const hashToken = async (token) => {
    return await bcrypt.hash(token, 10);
};

/**
 * Compare raw token to hashed DB token.
 */
export const compareTokenHash = async (token, hash) => {
    return await bcrypt.compare(token, hash);
};

/* ==========================================================
   🔹 OPTIONAL — JWT-BASED REFRESH TOKENS (if you prefer)
   ==========================================================
   (not currently used, but can be swapped in later easily)
   ========================================================== */
export const generateJwtRefreshToken = (payload, expires = "7d") => {
    return jwt.sign(payload, REFRESH_SECRET, { expiresIn: expires });
};

export const verifyJwtRefreshToken = (token) => {
    return jwt.verify(token, REFRESH_SECRET);
};
