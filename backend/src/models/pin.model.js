import mongoose from "mongoose";

const PinSchema = new mongoose.Schema({
    chatId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chat",
        required: true,
        index: true
    },
    messageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        required: true,
        index: true
    },
    pinnedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    pinnedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

PinSchema.index({ chatId: 1, messageId: 1 }, { unique: true });
const Pin = mongoose.models.Pin || mongoose.model("Pin", PinSchema);
export default Pin;
