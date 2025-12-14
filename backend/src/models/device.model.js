import mongoose from "mongoose";

const DeviceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  deviceId: {
    type: String,   // client-generated UUID
    required: true
  },
  deviceName: {
    type: String,
    default: ""
  },
  publicKey: {
    type: String,   // base64 public key
    required: true
  },
  preKeys: [{
    type: String    // optional prekeys for async E2E
  }],
  signedPreKey: {
    type: String    // optional (X3DH style)
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  isPrimary: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ["active", "logged_out", "removed"],
    default: "active"
  }
}, { timestamps: true });

DeviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true });
const Device = mongoose.models.Device || mongoose.model("Device", DeviceSchema);
export default Device;