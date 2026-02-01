import mongoose from "mongoose";

const ProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
    index: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    sparse: true,
    trim: true,
    index: true
  }, // used for search/display
  bio: {
    type: String,
    default: ""
  },
  avatarUrl: {
    type: String,
    required: true
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: null
  },
  primaryLanguage: {
    type: String,
    default: "en", // English by default
    match: /^[a-z]{2}$/, // ISO 639-1 two-letter codes
  },
  secondaryLanguage: {
    type: String,
    default: null,
    match: /^[a-z]{2}$/,
  },
  isDeactivated: {
    type: Boolean,
    default: false,
    index: true
  },
}, { timestamps: true });

const Profile = mongoose.models.Profile || mongoose.model("Profile", ProfileSchema);
export default Profile;