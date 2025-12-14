import mongoose from "mongoose";

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
    isGroup: {
        type: Boolean,
        default: false,
        index: true
    },
    groupAvatarUrl: {
        type: String,
        default: null
    },
    name: {
        type: String,
        default: null
    },      // group name (null for 1:1)
    description: {
        type: String,
        default: ''
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        default: null
    },
    pinnedMessageIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message"
    }],
    metadata: {
        type: Object,
        default: {}
    },
    settings: {
        type: settingSchema,
        default: () => ({})
    }
}, { timestamps: true });

ChatSchema.index({ updatedAt: -1 });
const Chat = mongoose.models.Chat || mongoose.model("Chat", ChatSchema);
export default Chat;