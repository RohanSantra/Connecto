// src/controllers/profile.controller.js

import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

import Profile from "../models/profile.model.js";
import User from "../models/user.model.js";

import mongoose from "mongoose";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

import { emitSocketEvent } from "../socket/index.js";
import { ChatEventEnum } from "../constants.js";
import Device from "../models/device.model.js";
import Session from "../models/session.model.js";
import Block from "../models/block.model.js";

/* ---------------------------------------------------------
   Utility – username suggestions
--------------------------------------------------------- */
const generateSuggestions = (username) => {
  const rand = () => Math.random().toString(36).substring(2, 5);
  const randNum = () => Math.floor(Math.random() * 9999);

  return [
    `${username}_${rand()}`,
    `${rand()}${username}`,
    `${username}${randNum()}`,
    `${username}.${rand()}`
  ];
};

const ensureActive = async (userId) => {
  const user = await User.findById(userId).select("accountStatus");
  if (user?.accountStatus === "deactivated") {
    throw new ApiError(403, "Account is deactivated");
  }
};

/* ---------------------------------------------------------
   1️⃣ SETUP PROFILE (after OTP/Google login)
--------------------------------------------------------- */
export const setupProfile = asyncHandler(async (req, res) => {
  const { username, bio, avatarUrl, primaryLanguage, secondaryLanguage } = req.body;
  const userId = req.user._id.toString();

  await ensureActive(userId);

  if (!username || !username.trim()) throw new ApiError(400, "Username required");
  if (username.trim().length < 3) throw new ApiError(400, "Username too short");

  const taken = await Profile.findOne({ username: username.trim() });
  if (taken) throw new ApiError(400, "Username already taken");

  const validLang = /^[a-z]{2}$/;
  if (primaryLanguage && !validLang.test(primaryLanguage))
    throw new ApiError(400, "Invalid primary language");
  if (secondaryLanguage && !validLang.test(secondaryLanguage))
    throw new ApiError(400, "Invalid secondary language");

  if (!req.file && !avatarUrl)
    throw new ApiError(400, "Avatar required");

  let finalAvatar = avatarUrl;

  if (req.file) {
    const uploaded = await uploadOnCloudinary(req.file.path);
    if (!uploaded?.secure_url) throw new ApiError(500, "Avatar upload failed");
    finalAvatar = uploaded.secure_url;
  }

  const profile = await Profile.findOneAndUpdate(
    { userId },
    {
      username: username.trim(),
      bio: bio || "",
      avatarUrl: finalAvatar,
      primaryLanguage: primaryLanguage || "en",
      secondaryLanguage: secondaryLanguage || null
    },
    { upsert: true, new: true }
  );

  await User.findByIdAndUpdate(userId, { isBoarded: true });

  emitSocketEvent(
    req,
    "user",
    userId,
    ChatEventEnum.USER_PROFILE_UPDATED,
    {
      userId,
      username: profile.username,
      avatarUrl: profile.avatarUrl,
      bio: profile.bio,
      primaryLanguage: profile.primaryLanguage,
      secondaryLanguage: profile.secondaryLanguage,
      timestamp: new Date()
    }
  );
  const user = await User.findById(userId)
    .select("email authProvider isBoarded accountStatus deactivatedAt")
    .lean();

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { ...profile.toObject(), user },
        "Profile setup complete"
      )
    );
});

/* ---------------------------------------------------------
   2️⃣ GET MY PROFILE
--------------------------------------------------------- */
export const getMyProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const profile = await Profile.findOne({ userId }).lean();
  if (!profile) throw new ApiError(404, "Profile not found");

  const user = await User.findById(userId)
    .select("email authProvider isBoarded accountStatus deactivatedAt")
    .lean();

  return res.json(
    new ApiResponse(200, { ...profile, user }, "Profile fetched")
  );
});

/* ---------------------------------------------------------
   3️⃣ UPDATE PROFILE
--------------------------------------------------------- */
export const updateProfile = asyncHandler(async (req, res) => {
  const { username, bio, avatarUrl, primaryLanguage, secondaryLanguage } =
    req.body;

  const userId = req.user._id.toString();
  await ensureActive(userId);

  if (username) {
    const exists = await Profile.findOne({
      username: username.trim(),
      userId: { $ne: userId }
    });
    if (exists) throw new ApiError(400, "Username already taken");
  }

  const validLang = /^[a-z]{2}$/;
  if (primaryLanguage && !validLang.test(primaryLanguage))
    throw new ApiError(400, "Invalid primary language");
  if (secondaryLanguage && !validLang.test(secondaryLanguage))
    throw new ApiError(400, "Invalid secondary language");

  const updated = await Profile.findOneAndUpdate(
    { userId },
    {
      $set: {
        ...(username && { username: username.trim() }),
        ...(bio !== undefined && { bio }),
        ...(avatarUrl && { avatarUrl }),
        ...(primaryLanguage && { primaryLanguage }),
        ...(secondaryLanguage && { secondaryLanguage })
      }
    },
    { new: true }
  );

  if (!updated) throw new ApiError(404, "Profile not found");

  emitSocketEvent(
    req,
    "user",
    userId,
    ChatEventEnum.USER_PROFILE_UPDATED,
    {
      userId,
      username: updated.username,
      avatarUrl: updated.avatarUrl,
      bio: updated.bio,
      primaryLanguage: updated.primaryLanguage,
      secondaryLanguage: updated.secondaryLanguage,
      timestamp: new Date()
    }
  );

  return res.json(
    new ApiResponse(200, updated, "Profile updated successfully")
  );
});

/* ---------------------------------------------------------
   4️⃣ CHECK USERNAME AVAILABILITY
--------------------------------------------------------- */
export const checkUsernameAvailability = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username || username.trim().length < 3)
    throw new ApiError(400, "Name too short");

  const exists = await Profile.findOne({ username: username.trim() });

  if (exists) {
    return res.json(
      new ApiResponse(200, {
        available: false,
        suggestions: generateSuggestions(username.trim())
      })
    );
  }

  return res.json(
    new ApiResponse(200, { available: true }, "Username available")
  );
});

/* ---------------------------------------------------------
   5️⃣ GET PROFILE BY USERNAME
--------------------------------------------------------- */
export const getProfileByUsername = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username || !username.trim())
    throw new ApiError(400, "Username required");

  const data = await Profile.aggregate([
    { $match: { username: username.trim() } },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user"
      }
    },
    { $unwind: "$user" },
    { $match: { "user.accountStatus": "active" } },
    {
      $project: {
        _id: 1,
        username: 1,
        bio: 1,
        avatarUrl: 1,
        isOnline: 1,
        lastSeen: 1,
        userId: "$user._id",
        email: "$user.email"
      }
    }
  ]);

  if (!data.length) throw new ApiError(404, "Profile not found");

  return res.json(
    new ApiResponse(200, data[0], "Profile fetched successfully")
  );
});

/* ---------------------------------------------------------
   6️⃣ SEARCH PROFILES
--------------------------------------------------------- */
export const searchProfiles = asyncHandler(async (req, res) => {
  const { query, chatId } = req.query;

  if (!query || query.trim().length < 2)
    throw new ApiError(400, "Query must be 2+ chars");

  const me = new mongoose.Types.ObjectId(req.user._id);
  const regex = new RegExp(query.trim(), "i");

  /* 🔒 USER BLOCK RELATIONS */
  const userBlocks = await Block.find({
    type: "user",
    $or: [{ blockedBy: me }, { blockedUser: me }]
  }).lean();

  const excluded = new Set();
  userBlocks.forEach(b => {
    excluded.add(String(b.blockedBy));
    excluded.add(String(b.blockedUser));
  });
  excluded.add(String(me));

  /* 🔒 GROUP BLOCK RELATIONS */
  if (chatId) {
    const chatBlockers = await Block.find({
      type: "chat",
      blockedChat: chatId
    }).select("blockedBy").lean();

    chatBlockers.forEach(b => excluded.add(String(b.blockedBy)));
  }

  const results = await Profile.aggregate([
    { $match: { username: { $regex: regex } } },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user"
      }
    },
    { $unwind: "$user" },
    {
      $match: {
        "user._id": {
          $nin: [...excluded].map(id => new mongoose.Types.ObjectId(id))
        },
        "user.isActive": true,
        "user.accountStatus": "active"
      }
    },
    {
      $project: {
        _id: 1,
        username: 1,
        avatarUrl: 1,
        bio: 1,
        isOnline: 1,
        lastSeen: 1,
        userId: "$user._id"
      }
    },
    { $limit: 15 }
  ]);

  return res.json(new ApiResponse(200, results, "Search results"));
});


// GET MANY PROFILES
export const getProfilesBulk = asyncHandler(async (req, res) => {
  const { userIds = [] } = req.body;
  if (!userIds.length) return res.json(new ApiResponse(200, []));

  const profiles = await Profile.find({
    userId: { $in: userIds }
  }).select("userId username avatarUrl isOnline lastSeen");

  res.json(new ApiResponse(200, profiles));
});


/* ---------------------------------------------------------
   7️⃣ UPDATE AVATAR
--------------------------------------------------------- */
export const updateAvatar = asyncHandler(async (req, res) => {
  if (!req.file?.path) throw new ApiError(400, "Avatar file missing");

  const userId = req.user._id.toString();
  await ensureActive(userId);

  const upload = await uploadOnCloudinary(req.file.path);
  if (!upload?.secure_url) throw new ApiError(500, "Upload failed");

  const updated = await Profile.findOneAndUpdate(
    { userId },
    { avatarUrl: upload.secure_url },
    { new: true }
  );

  emitSocketEvent(
    req,
    "user",
    userId,
    ChatEventEnum.USER_AVATAR_UPDATED,
    {
      userId,
      avatarUrl: updated.avatarUrl,
      timestamp: new Date()
    }
  );

  return res.json(
    new ApiResponse(200, updated, "Avatar updated successfully")
  );
});

/* ---------------------------------------------------------
   8️⃣ UPDATE ONLINE STATUS
--------------------------------------------------------- */
export const updateOnlineStatus = asyncHandler(async (req, res) => {
  const { isOnline } = req.body;

  if (typeof isOnline !== "boolean")
    throw new ApiError(400, "Boolean expected");

  const userId = req.user._id.toString();
  await ensureActive(userId);

  const profile = await Profile.findOneAndUpdate(
    { userId },
    {
      isOnline,
      lastSeen: isOnline ? null : new Date()
    },
    { new: true }
  );

  emitSocketEvent(
    req,
    "user",
    userId,
    ChatEventEnum.USER_STATUS_UPDATED,
    {
      userId,
      isOnline: profile.isOnline,
      lastSeen: profile.lastSeen,
      timestamp: new Date()
    }
  );

  return res.json(new ApiResponse(200, profile, "Status updated"));
});

/* ---------------------------------------------------------
   9️⃣ DELETE PROFILE (SOFT DELETE)
--------------------------------------------------------- */
export const deleteProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  await User.updateOne(
    { _id: userId },
    {
      isActive: false,
      accountStatus: "deactivated",
      deactivatedAt: new Date()
    }
  );

  await Profile.updateOne(
    { userId },
    {
      isOnline: false,
      isDeactivated: true,
      lastSeen: new Date()
    }
  );

  emitSocketEvent(req, "global", null, ChatEventEnum.USER_DELETED_EVENT, {
    userId,
    timestamp: new Date()
  });

  return res.json(200, [], "Account deactivated");
});

/* ---------------------------------------------------------
   🔟 BATCH ONLINE STATUS
--------------------------------------------------------- */
export const getOnlineStatuses = asyncHandler(async (req, res) => {
  const { userIds } = req.body;

  if (!Array.isArray(userIds) || !userIds.length)
    throw new ApiError(400, "userIds array required");

  const objectIds = userIds.map((id) => new mongoose.Types.ObjectId(id));

  const statuses = await Profile.aggregate([
    { $match: { userId: { $in: objectIds } } },
    {
      $project: {
        _id: 0,
        userId: 1,
        isOnline: 1,
        lastSeen: 1
      }
    }
  ]);

  return res.json(
    new ApiResponse(200, statuses, "Statuses fetched")
  );
});
