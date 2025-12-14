import mongoose from "mongoose";


const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    authProvider: {
        type: String,
        enum: ["email", "google"],
        default: "email"
    },
    googleId: {
        type: String,
        sparse: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isBoarded: {
        type: Boolean,
        default: false
    },
    publicKey: {
        type: String,
        default: null
    }, // optional account-level public key
    lastLogin: {
        type: Date,
        default: null
    }
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model("User", UserSchema);
export default User;