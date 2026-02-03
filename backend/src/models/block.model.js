import mongoose from "mongoose";

const { Schema, model } = mongoose;

const BlockSchema = new Schema({
    blockedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // either blockedUser or blockedChat will be set
    blockedUser: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    blockedChat: { type: Schema.Types.ObjectId, ref: "Chat", default: null, index: true },
    type: { type: String, enum: ["user", "chat"], required: true },
    reason: { type: String, default: null },
    createdAt: { type: Date, default: () => new Date(), index: true },
});

BlockSchema.index(
    { blockedBy: 1, blockedUser: 1 },
    { unique: true, partialFilterExpression: { type: "user" } }
);
BlockSchema.index(
    { blockedBy: 1, blockedChat: 1 },
    { unique: true, partialFilterExpression: { type: "chat" } }
);

const Block = mongoose.models.Block || model("Block", BlockSchema);
export default Block;
