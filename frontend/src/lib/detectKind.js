export function detectKind(att = {}) {
    const mime = (
        att?.mimeType ||
        att?.mimetype ||
        att?.contentType ||
        att?.type ||
        ""
    ).toLowerCase();

    const ext = (att?.filename || "")
        .split(".")
        .pop()
        .toLowerCase();

    if (mime.startsWith("image/")) return "image";
    if (mime.startsWith("video/")) return "video";
    if (mime.startsWith("audio/")) return "audio";

    const IMG = ["jpg", "jpeg", "png", "gif", "webp", "avif", "heic", "heif", "svg"];
    const VID = ["mp4", "mov", "mkv", "webm", "avi", "mpeg"];
    const AUD = ["mp3", "m4a", "aac", "ogg", "wav", "flac", "opus"];

    if (IMG.includes(ext)) return "image";
    if (VID.includes(ext)) return "video";
    if (AUD.includes(ext)) return "audio";

    return "file";
}
