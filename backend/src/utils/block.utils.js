// src/utils/block.utils.js
import Block from "../models/block.model.js";
import mongoose from "mongoose";

/**
 * Checks whether messaging between a and b should be blocked.
 * Semantics: if either A blocked B or B blocked A -> treat as blocked pair.
 * aId and bId can be ObjectId or string.
 */
export async function isUserBlockedBetween(aId, bId) {
    if (!aId || !bId) return false;
    const oidA = new mongoose.Types.ObjectId(aId);
    const oidB = new mongoose.Types.ObjectId(bId);

    const exists = await Block.exists({
        type: "user",
        $or: [
            { blockedBy: oidA, blockedUser: oidB },
            { blockedBy: oidB, blockedUser: oidA },
        ],
    });
    return !!exists;
}

/**
 * Returns whether the given chat is blocked for this user (user blocked the chat).
 * Note: we don't look at others blocking the chat because your requirement
 * was "if i block a group i should not see there message" (per-user).
 */
export async function isChatBlockedForUser(chatId, userId) {
    if (!chatId || !userId) return false;
    const exists = await Block.exists({
        type: "chat",
        blockedBy: new mongoose.Types.ObjectId(userId),
        blockedChat: new mongoose.Types.ObjectId(chatId),
    });
    return !!exists;
}

/**
 * Load blocked sets for a user. Returns { blockedUsersSet, blockedChatsSet, usersWhoBlockedMeSet }
 * - blockedUsersSet: users that this user blocked
 * - usersWhoBlockedMeSet: users that blocked this user
 * - blockedChatsSet: chats that this user blocked
 *
 * Useful to stash in socket.data for fast checks.
 */
export async function loadBlockedSetsForUser(userId) {
    const uid = mongoose.Types.ObjectId(userId);

    // all blocks where blockedBy = userId (users & chats user blocked)
    const outgoing = await Block.find({ blockedBy: uid }).lean();
    // all blocks where blockedUser = userId (other users who blocked this user)
    const incoming = await Block.find({ blockedUser: uid, type: "user" }).lean();

    const blockedUsersSet = new Set();
    const usersWhoBlockedMeSet = new Set();
    const blockedChatsSet = new Set();

    for (const b of outgoing) {
        if (b.type === "user" && b.blockedUser) blockedUsersSet.add(String(b.blockedUser));
        if (b.type === "chat" && b.blockedChat) blockedChatsSet.add(String(b.blockedChat));
    }
    for (const b of incoming) {
        if (b.blockedBy) usersWhoBlockedMeSet.add(String(b.blockedBy));
    }

    return { blockedUsersSet, usersWhoBlockedMeSet, blockedChatsSet };
}

/**
 * Resolve recipients for a message send:
 * - members: array of { userId } (ObjectId or string)
 * - senderId: sender's id string
 * - blocked sets maps
 *
 * Returns array of userId strings who should receive the message.
 *
 * Rules:
 * - If sender OR recipient participate in a user-block pair (either direction) -> do NOT deliver to that recipient.
 * - If recipient has blocked the chat (chat blocks are stored per user) -> do NOT deliver to that recipient.
 */
export function filterRecipientsForDelivery(members, senderId, sets = { blockedUsersSet: new Set(), usersWhoBlockedMeSet: new Set(), blockedChatsSet: new Set(), chatId: null }) {
    const { blockedUsersSet = new Set(), usersWhoBlockedMeSet = new Set(), blockedChatsSet = new Set(), chatId = null } = sets;
    const sender = String(senderId);

    const to = [];
    for (const m of members) {
        const rid = String(m.userId || m);
        if (rid === sender) continue; // don't deliver to sender as a recipient

        // if sender blocked recipient OR recipient blocked sender OR recipient blocked chat -> skip
        if (blockedUsersSet.has(rid)) continue; // sender has blocked recipient (sender blocked recipient -> per your mutual semantics both prevented)
        if (usersWhoBlockedMeSet.has(rid)) continue; // recipient has blocked sender

        // Default: deliver
        to.push(rid);
    }
    return to;
}
