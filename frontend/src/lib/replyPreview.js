import { badgeFor } from "@/lib/fileBadge";
import { detectKind } from "./detectKind";


export function summarizeAttachments(message = {}) {
  const atts = Array.isArray(message.attachments) ? message.attachments : [];

  const summary = {
    total: atts.length,
    image: 0,
    video: 0,
    audio: 0,
    file: 0,
  };

  atts.forEach((att) => {
    const k = detectKind(att);
    if (k === "image") summary.image++;
    else if (k === "video") summary.video++;
    else if (k === "audio") summary.audio++;
    else summary.file++;
  });

  return summary;
}

export function buildReplyPreviewText(message = {}) {
  const text = message?.plaintext?.trim();
  const { image, video, audio, file, total } = summarizeAttachments(message);

  // If it’s text-only reply
  if (text && total === 0) {
    return text.length > 60 ? text.slice(0, 60) + "…" : text;
  }

  const parts = [];

  if (image) parts.push(image === 1 ? "Photo" : `${image} photos`);
  if (video) parts.push(video === 1 ? "Video" : `${video} videos`);
  if (audio) parts.push(audio === 1 ? "Audio" : `${audio} audios`);
  if (file) parts.push(file === 1 ? "File" : `${file} files`);

  return parts.join(" • ") || "(Message)";
}
