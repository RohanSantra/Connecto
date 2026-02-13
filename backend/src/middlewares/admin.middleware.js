import ApiError from "../utils/ApiError.js";
import User from "../models/user.model.js";

export const isAdmin = async (req, res, next) => {
    // Simple example: assume you store admin flag on user doc or check email
    // Adjust to your RBAC system
    const user = await User.findById(req.user._id).lean();
    if (!user) return next(new ApiError(401, "Unauthorized"));
    // choose whichever field you use for admin; using accountStatus/admin flag placeholder
    if (!user.isAdmin) return next(new ApiError(403, "Admin required"));
    next();
};
