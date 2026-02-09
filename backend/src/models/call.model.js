// src/models/call.model.js
import mongoose from "mongoose";

const CallSchema = new mongoose.Schema({
    chatId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chat",
        required: true,
        index: true
    },
    callerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    calleeIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    type: {
        type: String,
        enum: ["audio", "video"],
        required: true
    },
    status: {
        type: String,
        enum: ["ringing", "accepted", "missed", "rejected", "ended"],
        default: "ringing"
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    endedAt: {
        type: Date,
        default: null
    },
    duration: {
        type: Number,
        default: 0
    }, // seconds
    metadata: {
        type: Object
    }, // e.g., rtc channel id, region, provider info
}, { timestamps: true });

CallSchema.index({ chatId: 1, startedAt: -1 });
const Call = mongoose.models.Call || mongoose.model("Call", CallSchema);
export default Call;