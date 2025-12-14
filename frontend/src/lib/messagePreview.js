export function getMediaPreviewIcon(lastMessage) {
    if (!lastMessage) return null;

    const hasAttachments =
        lastMessage.attachments && lastMessage.attachments.length > 0;

    if (!hasAttachments) return null;

    const file = lastMessage.attachments[0];
    const type = file.type || file.mimeType || "";

    if (type.startsWith("image/")) return "image";
    if (type.startsWith("video/")) return "video";
    if (type.startsWith("audio/")) return "audio";
    return "document";
}

export function getMessageStatusIcon(lastMessage, profile) {
    if (!lastMessage) return null;

    const myId = profile?.userId;
    if (lastMessage.senderId !== myId) return null; // Only show ticks for MY messages

    const delivered = lastMessage.deliveredTo || [];
    const read = lastMessage.readBy || [];

    const isDelivered = delivered.length > 0;
    const isRead = read.length > 0;

    if (isRead) return "read";
    if (isDelivered) return "delivered";
    return "sent";
}
