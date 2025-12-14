import mongoose from "mongoose";

const OtpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        index: true
    },
    otp: {
        type: String,
        required: true
    },
    attempts: {
        type: Number,
        default: 0
    },
    expiresAt: {
        type: Date,
         expires: "2m"
    }
}, { timestamps: true });

const Otp = mongoose.models.Otp || mongoose.model("Otp", OtpSchema);
export default Otp;

