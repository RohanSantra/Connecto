import mongoose from "mongoose";

const ChatMemberSchema = new mongoose.Schema({
    chatId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chat",
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    role: {
        type: String,
        enum: ["admin", "member"],
        default: "member"
    },
    joinedAt: {
        type: Date,
        default: Date.now
    },
    lastSeenAt: {
        type: Date,
        default: null
    },
    unreadCount: {
        type: Number,
        default: 0
    },
    mutedUntil: {
        type: Date,
        default: null
    },
    pinned: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

ChatMemberSchema.index({ chatId: 1, userId: 1 }, { unique: true });
const ChatMember = mongoose.models.ChatMember || mongoose.model("ChatMember", ChatMemberSchema);
export default ChatMember;