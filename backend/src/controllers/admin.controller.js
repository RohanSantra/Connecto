// src/controllers/admin.controller.js
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import dayjs from "dayjs";

import User from "../models/user.model.js";
import Profile from "../models/profile.model.js";
import Message from "../models/message.model.js";
import Call from "../models/call.model.js";
import Chat from "../models/chat.model.js";
import ChatMember from "../models/chatMember.model.js";

const { Types } = mongoose;

/* -----------------------
   Utility: parse date range
   ----------------------- */
function parseRange(query) {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from
        ? new Date(query.from)
        : dayjs(to).subtract(30, "day").toDate();
    return { from, to };
}

export const getGlobalStats = asyncHandler(async (req, res) => {
    const { from, to } = parseRange(req.query);
    const includeProfile = String(req.query.includeProfile) === "true";

    // safety: ensure from <= to
    if (from > to) throw new ApiError(400, "Invalid range: from must be before to");

    // 1) basic users totals
    const totalUsers = await User.countDocuments({});
    const activeUsers = await User.countDocuments({ isActive: true });
    const newUsers = await User.countDocuments({
        createdAt: { $gte: from, $lte: to },
    });

    // 2) messages totals
    const totalMessages = await Message.countDocuments({
        createdAt: { $gte: from, $lte: to },
        deleted: false,
    });

    // 3) messages time-series (fixed daily buckets)
    const messagesByPeriod = await Message.aggregate([
        { $match: { createdAt: { $gte: from, $lte: to }, deleted: false } },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                count: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ]);

    // numeric summary for messages per day (avg)
    const daysDiff = Math.max(
        1,
        Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
    );
    const avgMessagesPerDay = +(totalMessages / daysDiff).toFixed(2);

    // 4) messages by type
    const messagesByType = await Message.aggregate([
        { $match: { createdAt: { $gte: from, $lte: to }, deleted: false } },
        { $group: { _id: "$type", count: { $sum: 1 } } },
    ]);

    // 5) calls: counts, breakdown, avg durations
    const callsAgg = await Call.aggregate([
        { $match: { startedAt: { $gte: from, $lte: to } } },
        {
            $group: {
                _id: "$type",
                count: { $sum: 1 },
                avgDurationSec: { $avg: "$duration" },
                totalDurationSec: { $sum: "$duration" },
            },
        },
    ]);
    const totalCalls = callsAgg.reduce((s, a) => s + (a.count || 0), 0);

    // 6) media breakdown (count + bytes) by category (image/video/audio/document/other)
    const mediaAgg = await Message.aggregate([
        {
            $match: {
                createdAt: { $gte: from, $lte: to },
                deleted: false,
                "attachments.0": { $exists: true },
            },
        },
        { $unwind: "$attachments" },
        {
            $project: {
                size: { $ifNull: ["$attachments.size", 0] },
                mime: "$attachments.mimeType",
            },
        },
        {
            $group: {
                _id: {
                    $switch: {
                        branches: [
                            { case: { $regexMatch: { input: "$mime", regex: /^image\//i } }, then: "image" },
                            { case: { $regexMatch: { input: "$mime", regex: /^video\//i } }, then: "video" },
                            { case: { $regexMatch: { input: "$mime", regex: /^audio\//i } }, then: "audio" },
                            { case: { $regexMatch: { input: "$mime", regex: /^(application|text)\//i } }, then: "document" },
                        ],
                        default: "other",
                    },
                },
                count: { $sum: 1 },
                bytes: { $sum: "$size" },
            },
        },
    ]);

    // 7) top chats (summary) — top N and aggregated counters of groups vs directs
    const TOP_N = Number(req.query.limit) || 10;
    const topChatsRaw = await Message.aggregate([
        { $match: { createdAt: { $gte: from, $lte: to }, deleted: false } },
        { $group: { _id: "$chatId", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: TOP_N },
        {
            $lookup: {
                from: "chats",
                localField: "_id",
                foreignField: "_id",
                as: "chat",
            },
        },
        { $unwind: { path: "$chat", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                chatId: "$_id",
                count: 1,
                isGroup: "$chat.isGroup",
                name: "$chat.name",
            },
        },
    ]);

    const topChatsSummary = {
        totalTop: topChatsRaw.length,
        groups: topChatsRaw.filter((c) => c.isGroup).length,
        directs: topChatsRaw.filter((c) => !c.isGroup).length,
    };

    // 8) peak hours (0-23) — we still provide counts by hour (useful as summary)
    const peakHours = await Message.aggregate([
        { $match: { createdAt: { $gte: from, $lte: to }, deleted: false } },
        { $group: { _id: { $hour: "$createdAt" }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
    ]);

    // 9) storage growth trend — daily bytes aggregated for attachments
    const storageTrend = await Message.aggregate([
        { $match: { createdAt: { $gte: from, $lte: to }, "attachments.0": { $exists: true }, deleted: false } },
        { $unwind: "$attachments" },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                totalBytes: { $sum: { $ifNull: ["$attachments.size", 0] } },
                count: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ]);

    // 10) top users by messages (optionally include full user object)
    const topUsers = await Message.aggregate([
        { $match: { createdAt: { $gte: from, $lte: to }, deleted: false } },
        { $group: { _id: "$senderId", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: TOP_N },
        {
            $lookup: {
                from: "profiles",
                localField: "_id",
                foreignField: "userId",
                as: "profile",
            },
        },
        { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                userId: "$_id",
                count: 1,
                username: "$profile.username",
                avatarUrl: "$profile.avatarUrl",
                isDeactivated: "$profile.isDeactivated",
                lastSeen: "$profile.lastSeen",
            },
        },
    ]);

    let topUsersWithFull = topUsers;
    if (includeProfile && topUsers.length) {
        const ids = topUsers.map((t) => t.userId).filter(Boolean);
        const users = await User.find({ _id: { $in: ids } })
            .select("email isActive createdAt lastLogin isAdmin accountStatus")
            .lean();
        const userMap = new Map(users.map((u) => [String(u._id), u]));
        topUsersWithFull = topUsers.map((t) => ({ ...t, user: userMap.get(String(t.userId)) || null }));
    }

    return res.json(
        new ApiResponse(
            200,
            {
                range: { from, to },
                period: "day", // server-side fixed bucket semantics (clients do not provide period)
                users: { totalUsers, activeUsers, newUsers },
                messages: {
                    totalMessages,
                    avgMessagesPerDay,
                    byPeriod: messagesByPeriod, // daily buckets
                    byType: messagesByType,
                },
                calls: { totalCalls, breakdown: callsAgg },
                media: { byCategory: mediaAgg },
                topChats: { list: topChatsRaw, summary: topChatsSummary },
                topUsers: topUsersWithFull,
                peakHours,
                storageTrend,
            },
            "Global stats"
        )
    );
});

/* ======================================================
   GET CHAT STATS
   Returns counts for a single chat + media + per-member stats
   Query params: includeMembers=true
   ====================================================== */
export const getChatStats = asyncHandler(async (req, res) => {
    const { chatId } = req.params;
    if (!Types.ObjectId.isValid(chatId)) throw new ApiError(400, "Invalid chatId");
    const { from, to } = parseRange(req.query);

    // total messages in chat
    const totalMessages = await Message.countDocuments({
        chatId: new Types.ObjectId(chatId),
        createdAt: { $gte: from, $lte: to },
        deleted: false,
    });

    // messages per day (fixed daily buckets)
    const messagesByPeriod = await Message.aggregate([
        { $match: { chatId: new Types.ObjectId(chatId), createdAt: { $gte: from, $lte: to }, deleted: false } },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                count: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ]);

    // media counts in chat (by category + bytes)
    const media = await Message.aggregate([
        { $match: { chatId: new Types.ObjectId(chatId), createdAt: { $gte: from, $lte: to }, deleted: false, "attachments.0": { $exists: true } } },
        { $unwind: "$attachments" },
        {
            $group: {
                _id: {
                    $switch: {
                        branches: [
                            { case: { $regexMatch: { input: "$attachments.mimeType", regex: /^image\//i } }, then: "image" },
                            { case: { $regexMatch: { input: "$attachments.mimeType", regex: /^video\//i } }, then: "video" },
                            { case: { $regexMatch: { input: "$attachments.mimeType", regex: /^audio\//i } }, then: "audio" },
                            { case: { $regexMatch: { input: "$attachments.mimeType", regex: /^(application|text)\//i } }, then: "document" },
                        ],
                        default: "other",
                    },
                },
                count: { $sum: 1 },
                bytes: { $sum: { $ifNull: ["$attachments.size", 0] } },
            },
        },
        { $sort: { count: -1 } },
    ]);

    // members & messages per user (top)
    const members = await ChatMember.find({ chatId: new Types.ObjectId(chatId) }).select("userId role joinedAt").lean();
    const memberCount = members.length;
    const messagesPerUser = await Message.aggregate([
        { $match: { chatId: new Types.ObjectId(chatId), createdAt: { $gte: from, $lte: to }, deleted: false } },
        { $group: { _id: "$senderId", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
    ]);

    // optionally include member profiles if requested
    const includeMembers = String(req.query.includeMembers) === "true";
    let memberProfiles = [];
    if (includeMembers && members.length) {
        const ids = members.map((m) => m.userId);
        memberProfiles = await Profile.find({ userId: { $in: ids } }).select("userId username avatarUrl lastSeen isDeactivated").lean();
    }

    const avgPerMember = memberCount ? (messagesPerUser.reduce((s, m) => s + m.count, 0) / memberCount) : 0;

    return res.json(
        new ApiResponse(
            200,
            {
                chatId,
                range: { from, to },
                totalMessages,
                messagesByPeriod,
                media,
                memberCount,
                members: includeMembers ? memberProfiles : undefined,
                messagesPerUser,
                avgPerMember: +avgPerMember.toFixed(2),
            },
            "Chat stats"
        )
    );
});

/* ======================================================
   GET USER STATS
   Numeric metrics about a user's activity (range-only)
   Query params: includeProfile=true
   ====================================================== */
export const getUserStats = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    if (!Types.ObjectId.isValid(userId)) throw new ApiError(400, "Invalid userId");
    const { from, to } = parseRange(req.query);

    // messages sent
    const totalMessages = await Message.countDocuments({
        senderId: new Types.ObjectId(userId),
        createdAt: { $gte: from, $lte: to },
        deleted: false,
    });

    // messages per day (fixed)
    const messagesByPeriod = await Message.aggregate([
        { $match: { senderId: new Types.ObjectId(userId), createdAt: { $gte: from, $lte: to }, deleted: false } },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                count: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ]);

    // calls initiated & durations
    const callsAgg = await Call.aggregate([
        { $match: { callerId: new Types.ObjectId(userId), startedAt: { $gte: from, $lte: to } } },
        { $group: { _id: "$type", count: { $sum: 1 }, totalDurationSec: { $sum: "$duration" }, avgDurationSec: { $avg: "$duration" } } },
    ]);
    const callsInitiated = callsAgg.reduce((s, a) => s + (a.count || 0), 0);

    // media uploaded (attachments) by category
    const mediaSent = await Message.aggregate([
        { $match: { senderId: new Types.ObjectId(userId), createdAt: { $gte: from, $lte: to }, deleted: false, "attachments.0": { $exists: true } } },
        { $unwind: "$attachments" },
        {
            $group: {
                _id: {
                    $switch: {
                        branches: [
                            { case: { $regexMatch: { input: "$attachments.mimeType", regex: /^image\//i } }, then: "image" },
                            { case: { $regexMatch: { input: "$attachments.mimeType", regex: /^video\//i } }, then: "video" },
                            { case: { $regexMatch: { input: "$attachments.mimeType", regex: /^audio\//i } }, then: "audio" },
                            { case: { $regexMatch: { input: "$attachments.mimeType", regex: /^(application|text)\//i } }, then: "document" },
                        ],
                        default: "other",
                    },
                },
                count: { $sum: 1 },
                bytes: { $sum: { $ifNull: ["$attachments.size", 0] } },
            },
        },
    ]);

    // profile summary (lean)
    const includeProfile = String(req.query.includeProfile) === "true";
    const profile = includeProfile
        ? await Profile.findOne({ userId: new Types.ObjectId(userId) }).select("username avatarUrl isDeactivated lastSeen bio").lean()
        : await Profile.findOne({ userId: new Types.ObjectId(userId) }).select("username avatarUrl isDeactivated lastSeen").lean();

    return res.json(
        new ApiResponse(
            200,
            {
                userId,
                range: { from, to },
                totals: { totalMessages, callsInitiated },
                messagesByPeriod,
                calls: callsAgg,
                mediaSent,
                profile,
            },
            "User stats"
        )
    );
});

/* ======================================================
   GET CALL STATS (global or filtered by chat/user)
   Query params: chatId, type=audio|video
   NOTE: timeseries uses fixed daily buckets
   ====================================================== */
export const getCallStats = asyncHandler(async (req, res) => {
    const { from, to } = parseRange(req.query);
    const { chatId, type } = req.query;

    const match = { startedAt: { $gte: from, $lte: to } };
    if (chatId && Types.ObjectId.isValid(chatId)) match.chatId = new Types.ObjectId(chatId);
    if (type && ["audio", "video"].includes(type)) match.type = type;

    // grouped by type totals
    const aggByType = await Call.aggregate([
        { $match: match },
        {
            $group: {
                _id: "$type",
                count: { $sum: 1 },
                avgDurationSec: { $avg: "$duration" },
                totalDurationSec: { $sum: "$duration" },
            },
        },
    ]);

    // timeseries for calls total by day (fixed)
    const timeseries = await Call.aggregate([
        { $match: match },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$startedAt" } },
                count: { $sum: 1 },
                totalDurationSec: { $sum: "$duration" },
            },
        },
        { $sort: { _id: 1 } },
    ]);

    const totals = aggByType.reduce((acc, a) => {
        acc.totalCalls = (acc.totalCalls || 0) + (a.count || 0);
        acc[a._id] = a;
        return acc;
    }, {});

    return res.json(new ApiResponse(200, { range: { from, to }, period: "day", totals, raw: aggByType, timeseries }, "Call stats"));
});

/* ======================================================
   GET MEDIA STATS (range-only)
   - chatId optional to filter single chat
   - returns both byCategory and daily timeseries
   ====================================================== */
export const getMediaStats = asyncHandler(async (req, res) => {
    const { from, to } = parseRange(req.query);
    const { chatId } = req.query;
    const match = { createdAt: { $gte: from, $lte: to }, "attachments.0": { $exists: true }, deleted: false };
    if (chatId && Types.ObjectId.isValid(chatId)) match.chatId = new Types.ObjectId(chatId);

    // by category totals
    const agg = await Message.aggregate([
        { $match: match },
        { $unwind: "$attachments" },
        {
            $group: {
                _id: {
                    $switch: {
                        branches: [
                            { case: { $regexMatch: { input: "$attachments.mimeType", regex: /^image\//i } }, then: "image" },
                            { case: { $regexMatch: { input: "$attachments.mimeType", regex: /^video\//i } }, then: "video" },
                            { case: { $regexMatch: { input: "$attachments.mimeType", regex: /^audio\//i } }, then: "audio" },
                            { case: { $regexMatch: { input: "$attachments.mimeType", regex: /^(application|text)\//i } }, then: "document" },
                        ],
                        default: "other",
                    },
                },
                count: { $sum: 1 },
                bytes: { $sum: { $ifNull: ["$attachments.size", 0] } },
            },
        },
    ]);

    // timeseries by day per category
    const aggTimeseries = await Message.aggregate([
        { $match: match },
        { $unwind: "$attachments" },
        {
            $project: {
                bucket: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                size: { $ifNull: ["$attachments.size", 0] },
                mime: "$attachments.mimeType",
            },
        },
        {
            $group: {
                _id: {
                    bucket: "$bucket",
                    cat: {
                        $switch: {
                            branches: [
                                { case: { $regexMatch: { input: "$mime", regex: /^image\//i } }, then: "image" },
                                { case: { $regexMatch: { input: "$mime", regex: /^video\//i } }, then: "video" },
                                { case: { $regexMatch: { input: "$mime", regex: /^audio\//i } }, then: "audio" },
                                { case: { $regexMatch: { input: "$mime", regex: /^(application|text)\//i } }, then: "document" },
                            ],
                            default: "other",
                        },
                    },
                },
                count: { $sum: 1 },
                bytes: { $sum: "$size" },
            },
        },
        { $sort: { "_id.bucket": 1 } },
    ]);

    // reshape to an easier frontend shape: { bucket: 'YYYY-MM-DD', categories: [{cat, count, bytes}] }
    const map = new Map();
    aggTimeseries.forEach((r) => {
        const bucketKey = r._id.bucket;
        const cat = r._id.cat;
        if (!map.has(bucketKey)) map.set(bucketKey, []);
        map.get(bucketKey).push({ category: cat, count: r.count, bytes: r.bytes });
    });
    const timeseries = Array.from(map.entries()).map(([bucket, cats]) => ({ bucket, categories: cats }));

    return res.json(new ApiResponse(200, { range: { from, to }, byCategory: agg, period: "day", timeseries }, "Media stats"));
});

/* ======================================================
   ACTIVITY TIMELINE (range-only, daily buckets)
   /admin/stats/activity?from=&to=
   ====================================================== */
export const getActivityTimeline = asyncHandler(async (req, res) => {
    const { from, to } = parseRange(req.query);

    const agg = await Message.aggregate([
        { $match: { createdAt: { $gte: from, $lte: to }, deleted: false } },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                count: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ]);

    return res.json(new ApiResponse(200, { range: { from, to }, unit: "day", timeline: agg }, "Activity timeline"));
});

/* ======================================================
   TOP ENTITIES (chats or users)
   /admin/stats/top?type=chats|users&limit=10&from=&to=&summaryOnly=true
   ====================================================== */
export const getTopEntities = asyncHandler(async (req, res) => {
    const { from, to } = parseRange(req.query);
    const type = req.query.type === "users" ? "users" : "chats";
    const limit = Number(req.query.limit) || 10;
    const summaryOnly = String(req.query.summaryOnly) === "true";
    const includeProfile = String(req.query.includeProfile) === "true";

    if (type === "chats") {
        const pipeline = [
            { $match: { createdAt: { $gte: from, $lte: to }, deleted: false } },
            { $group: { _id: "$chatId", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: limit },
            { $lookup: { from: "chats", localField: "_id", foreignField: "_id", as: "chat" } },
            { $unwind: { path: "$chat", preserveNullAndEmptyArrays: true } },
            { $project: { chatId: "$_id", isGroup: "$chat.isGroup", name: "$chat.name", count: 1 } },
        ];

        const top = await Message.aggregate(pipeline);

        if (summaryOnly) {
            const groups = top.filter((t) => t.isGroup).length;
            const directs = top.length - groups;
            return res.json(new ApiResponse(200, { total: top.length, groups, directs }, "Top chats summary"));
        }

        return res.json(new ApiResponse(200, { top, summary: { total: top.length, groups: top.filter((t) => t.isGroup).length } }, "Top chats"));
    } else {
        // users
        const pipeline = [
            { $match: { createdAt: { $gte: from, $lte: to }, deleted: false } },
            { $group: { _id: "$senderId", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: limit },
            { $lookup: { from: "profiles", localField: "_id", foreignField: "userId", as: "profile" } },
            { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
            { $project: { userId: "$_id", username: "$profile.username", avatarUrl: "$profile.avatarUrl", isDeactivated: "$profile.isDeactivated", lastSeen: "$profile.lastSeen", count: 1 } },
        ];

        const top = await Message.aggregate(pipeline);

        if (summaryOnly) {
            return res.json(new ApiResponse(200, { total: top.length }, "Top users summary"));
        }

        if (includeProfile && top.length) {
            const ids = top.map((t) => t.userId).filter(Boolean);
            const users = await User.find({ _id: { $in: ids } }).select("email isActive createdAt isAdmin").lean();
            const map = new Map(users.map((u) => [String(u._id), u]));
            const enriched = top.map((t) => ({ ...t, user: map.get(String(t.userId)) || null }));
            return res.json(new ApiResponse(200, { top: enriched }, "Top users (enriched)"));
        }

        return res.json(new ApiResponse(200, { top }, "Top users"));
    }
});

/* ======================================================
   PROMOTE / DEMOTE (unchanged)
   ====================================================== */
export const promoteUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    if (!Types.ObjectId.isValid(userId)) throw new ApiError(400, "Invalid userId");

    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");
    if (user.isAdmin) return res.json(new ApiResponse(200, null, "User already admin"));

    user.isAdmin = true;
    await user.save();

    return res.json(new ApiResponse(200, null, "User promoted to admin"));
});

export const demoteUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    if (!Types.ObjectId.isValid(userId)) throw new ApiError(400, "Invalid userId");

    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");
    if (!user.isAdmin) return res.json(new ApiResponse(200, null, "User is not an admin"));

    user.isAdmin = false;
    await user.save();

    return res.json(new ApiResponse(200, null, "User demoted from admin"));
});

/* ======================================================
   EXPORT USER SUMMARY (unchanged)
   ====================================================== */
export const exportUserSummary = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    if (!Types.ObjectId.isValid(userId)) throw new ApiError(400, "Invalid userId");
    const { from, to } = parseRange(req.query);

    const totalMessages = await Message.countDocuments({
        senderId: new Types.ObjectId(userId),
        createdAt: { $gte: from, $lte: to },
    });

    const mediaSent = await Message.aggregate([
        { $match: { senderId: new Types.ObjectId(userId), createdAt: { $gte: from, $lte: to }, "attachments.0": { $exists: true } } },
        { $unwind: "$attachments" },
        { $group: { _id: "$attachments.mimeType", count: { $sum: 1 }, bytes: { $sum: { $ifNull: ["$attachments.size", 0] } } } },
    ]);

    const callsInitiated = await Call.countDocuments({ callerId: new Types.ObjectId(userId), startedAt: { $gte: from, $lte: to } });

    const activeChats = await ChatMember.aggregate([
        { $match: { userId: new Types.ObjectId(userId) } },
        { $group: { _id: "$chatId", lastJoin: { $max: "$joinedAt" } } },
        { $lookup: { from: "chats", localField: "_id", foreignField: "_id", as: "chat" } },
        { $unwind: { path: "$chat", preserveNullAndEmptyArrays: true } },
        { $project: { chatId: "$_id", name: "$chat.name", isGroup: "$chat.isGroup", lastJoin: 1 } },
    ]);

    const summary = {
        userId,
        range: { from, to },
        totals: { totalMessages, callsInitiated },
        mediaSent,
        activeChats,
    };

    return res.json(new ApiResponse(200, summary, "User summary (numeric)"));
});
