// src/models/connecto.models.js
import mongoose from "mongoose";

/* ==========================================================
   Connecto - Combined Models (final)
   - Multi-device ready
   - E2E-ready message + attachments
   - Reply / Edit / Delete-for / Pin / Call support
   - Sessions per device (refresh token rotation)
   ========================================================== */

/* -------------------------
   1) User
   ------------------------- */
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  authProvider: { type: String, enum: ["email", "google"], default: "email" },
  googleId: { type: String, sparse: true },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  isBoarded: { type: Boolean, default: false },
  publicKey: { type: String, default: null }, // optional account-level public key
  lastLogin: { type: Date, default: null }
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model("User", UserSchema);

/* -------------------------
   2) Profile
   ------------------------- */
const ProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
  username: { type: String, unique: true, sparse: true, trim: true }, // used for search/display
  bio: { type: String, default: "" },
  avatarUrl: { type: String, default: "" },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: null },
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
}, { timestamps: true });

export const Profile = mongoose.models.Profile || mongoose.model("Profile", ProfileSchema);

/* -------------------------
   3) Device
   - each device has its own publicKey for E2EE
   ------------------------- */
const DeviceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  deviceId: { type: String, required: true }, // client-generated UUID
  deviceName: { type: String, default: "" },
  publicKey: { type: String, required: true }, // base64 public key
  preKeys: [{ type: String }],                 // optional prekeys for async E2E
  signedPreKey: { type: String },              // optional (X3DH style)
  lastSeen: { type: Date, default: Date.now },
  isPrimary: { type: Boolean, default: false },
  status: { type: String, enum: ["active", "logged_out"], default: "active" }
}, { timestamps: true });

DeviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true });
export const Device = mongoose.models.Device || mongoose.model("Device", DeviceSchema);

/* -------------------------
   4) Session
   - one session (refresh token) per device login
   ------------------------- */
const SessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  deviceId: { type: String, required: true }, // links to Device.deviceId
  hashedRefreshToken: { type: String, required: true },
  issuedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: true },
  revoked: { type: Boolean, default: false },
  meta: { type: Object } // optional metadata: ip, ua
}, { timestamps: true });

SessionSchema.index({ userId: 1, revoked: 1 });
export const Session = mongoose.models.Session || mongoose.model("Session", SessionSchema);

/* -------------------------
   5) Otp (TTL)
   ------------------------- */
const OtpSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  otp: { type: String, required: true },
  type: { type: String, enum: ["signup", "login"], default: "login" },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, index: true }
}, { timestamps: true });

OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const Otp = mongoose.models.Otp || mongoose.model("Otp", OtpSchema);

/* -------------------------
   6) Chat
   ------------------------- */

const settingSchema = new mongoose.Schema({
  allowAnyoneToRename: {
    type: Boolean,
    default: false
  },
  allowAnyoneToChangeAvatar: {
    type: Boolean,
    default: false
  },
  allowAnyoneToAddMembers: {
    type: Boolean,
    default: false
  },
  allowAnyoneToRemoveMembers: {
    type: Boolean,
    default: false
  }
}, {
  _id: false

})
const ChatSchema = new mongoose.Schema({
  isGroup: { type: Boolean, default: false, index: true },
  groupAvatarUrl: { type: String, default: null },
  name: { type: String, default: null },      // group name (null for 1:1)
  description: { type: String, default: '' },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },
  pinnedMessageIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Message" }],
  metadata: { type: Object, default: {} },
  settings: {
    type: settingSchema,
    default: () => ({})
  }
}, { timestamps: true });

ChatSchema.index({ updatedAt: -1 });
export const Chat = mongoose.models.Chat || mongoose.model("Chat", ChatSchema);


/* -------------------------
   7) ChatMember (many-to-many link + per-user chat facts)
   ------------------------- */
const ChatMemberSchema = new mongoose.Schema({
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  role: { type: String, enum: ["admin", "member"], default: "member" },
  joinedAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: null },
  unreadCount: { type: Number, default: 0 },
  mutedUntil: { type: Date, default: null },
  pinned: { type: Boolean, default: false }
}, { timestamps: true });

ChatMemberSchema.index({ chatId: 1, userId: 1 }, { unique: true });
export const ChatMember = mongoose.models.ChatMember || mongoose.model("ChatMember", ChatMemberSchema);

/* -------------------------
   8) Message + attachments + encrypted keys
   - supports reply, edit history, deleteFor, systemType, pinned
   ------------------------- */

/* encryptedKey: per-recipient/per-device encrypted symmetric key */
const EncryptedKeySchema = new mongoose.Schema({
  recipientUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  recipientDeviceId: {
    type: String,
    required: true
  }, // device id to which this key is targeted
  encryptedKey: {
    type: String,
    required: true
  },     // base64 ciphertext (nacl.box)
  senderEphemeralPublicKey: {
    type: String,
    required: true
  }, // base64
  nonce: {
    type: String,
    required: true
  }             // base64
}, { _id: false });

/* attachment metadata */
const AttachmentSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },

  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  cloudinary: {
    public_id: String,
    resource_type: String,
    url: String,
    secure_url: String,
    bytes: Number,
    width: Number,
    height: Number
  },
  fileEncrypted: {
    type: Boolean,
    default: false
  }, // true if client encrypted file before upload
  fileNonce: {

    type: String,
    default: null
  }        // base64 nonce used for file secretbox
}, { _id: false });

/* edit history record (keeps previous ciphertext versions) */
const EditHistorySchema = new mongoose.Schema({
  ciphertext: {
    type: String,
    required: true
  },
  ciphertextNonce: {
    type: String,
    required: true
  },
  editedAt: {
    type: Date,
    required: true
  },
  editedByDeviceId: {
    type: String
  } // which device performed edit
}, { _id: false });


const ReactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  reaction: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }, // store when reacted
}, { _id: false });

const MessageSchema = new mongoose.Schema({
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Chat",
    required: true,
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  senderDeviceId: {
    type: String,
    required: true
  }, // which device sent this message
  // core encrypted payload
  ciphertext: {
    type: String,
    required: true
  },      // base64 encrypted message body
  ciphertextNonce: {
    type:
      String,
    required: true
  },
  type: {
    type: String,
    enum: ["text", "attachment", "system", "audio"],
    default: "text"
  },

  // reply support: message is a reply to another message
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Message",
    default: null
  },

  // attachments (images, video, audio files, documents, voice notes)
  attachments: [AttachmentSchema],

  // per-recipient encrypted symmetric keys (targeted at recipient device)
  encryptedKeys: [EncryptedKeySchema],

  // edits and audit
  edited: {
    type: Boolean,
    default: false
  },
  editHistory: [EditHistorySchema], // keep previous ciphertexts (optional, for audit)

  // deletion
  deleted: {
    type: Boolean,
    default: false
  }, // delete for everyone
  deletedFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }], // delete only for these users (delete-for-me)

  deliveredTo: [{
    _id: false,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    deliveredAt: {
      type: Date,
      required: true
    }
  }], // delivered but not yet read

  readBy: [{
    _id: false,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    readAt: {
      type: Date,
      required: true
    }
  }], // users who read
  reactions: [ReactionSchema],

  // pin
  pinned: {
    type: Boolean,
    default: false
  },

  // system message classification (when type === 'system')
  systemType: {
    type: String,
    enum: ["user_joined", "user_left", "chat_renamed", "member_promoted", "member_demoted", "pinned_message", "unpinned_message"],
    default: null
  }
}, { timestamps: true });

MessageSchema.index({ chatId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1, createdAt: -1 });
export const Message = mongoose.models.Message || mongoose.model("Message", MessageSchema);

/* -------------------------
   9) Pin (audit)
   ------------------------- */
const PinSchema = new mongoose.Schema({
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true, index: true },
  messageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message", required: true, index: true },
  pinnedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  pinnedAt: { type: Date, default: Date.now }
}, { timestamps: true });

PinSchema.index({ chatId: 1, messageId: 1 }, { unique: true });
export const Pin = mongoose.models.Pin || mongoose.model("Pin", PinSchema);


/* -------------------------
   11) Call (audio/video calls log & statuses)
   - supports group/1:1 calls, statuses, durations
   ------------------------- */
const CallSchema = new mongoose.Schema({
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true, index: true },
  callerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  calleeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // participants
  type: { type: String, enum: ["audio", "video"], required: true },
  status: { type: String, enum: ["ringing", "accepted", "missed", "rejected", "ended"], default: "ringing" },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date, default: null },
  duration: { type: Number, default: 0 }, // seconds
  metadata: { type: Object } // e.g., rtc channel id, server region, quality stats
}, { timestamps: true });

CallSchema.index({ chatId: 1, startedAt: -1 });
export const Call = mongoose.models.Call || mongoose.model("Call", CallSchema);

/* -------------------------
   Utility reminders:
   - run writes that modify Message + Chat + ChatMember in transactions (replica set) to keep consistency
   - use TTL index for Otp, Session.expiresAt cleanup + background job for any other pruning
   - Cloudinary metadata only stored; for true E2EE encrypt files client-side before upload
   ------------------------- */
