import mongoose from "mongoose";

const EncryptedKeySchema = new mongoose.Schema({
    recipientUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
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
    clientTempId: {
        type: String,
        default: null,
        index: true,
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
const Message = mongoose.models.Message || mongoose.model("Message", MessageSchema);
export default Message;
