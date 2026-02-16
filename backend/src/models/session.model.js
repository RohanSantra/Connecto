import dayjs from "dayjs";
import mongoose from "mongoose";

const SessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    deviceId: {
        type: String,
    }, // links to Device.deviceId
    hashedRefreshToken: {
        type: String,
    },
    issuedAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        required: true,
        default: () => dayjs().add(7, "day").toDate(),
        index: true
    },
    revoked: {
        type: Boolean,
        default: false
    },
    meta: {
        type: Object
    } // optional metadata: ip, ua
}, { timestamps: true });

SessionSchema.index({ userId: 1, revoked: 1 });
const Session = mongoose.models.Session || mongoose.model("Session", SessionSchema);
export default Session;