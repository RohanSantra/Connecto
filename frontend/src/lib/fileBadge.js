// src/lib/fileBadge.js
export const FILE_BADGE_MAP = {
  // images
  jpg: ["IMG", "bg-emerald-100 text-emerald-800"],
  jpeg: ["IMG", "bg-emerald-100 text-emerald-800"],
  png: ["PNG", "bg-emerald-100 text-emerald-800"],
  webp: ["WEBP", "bg-emerald-100 text-emerald-800"],
  bmp: ["BMP", "bg-emerald-100 text-emerald-800"],
  gif: ["GIF", "bg-pink-100 text-pink-800"],
  heic: ["HEIC", "bg-rose-100 text-rose-800"],
  heif: ["HEIF", "bg-rose-100 text-rose-800"],
  tiff: ["TIFF", "bg-emerald-100 text-emerald-800"],
  svg: ["SVG", "bg-emerald-100 text-emerald-800"],

  // documents
  pdf: ["PDF", "bg-red-100 text-red-800"],
  txt: ["TXT", "bg-slate-100 text-slate-800"],
  md: ["MD", "bg-slate-100 text-slate-800"],
  rtf: ["RTF", "bg-slate-100 text-slate-800"],

  // office
  doc: ["DOC", "bg-sky-100 text-sky-800"],
  docx: ["DOCX", "bg-sky-100 text-sky-800"],
  odt: ["ODT", "bg-sky-100 text-sky-800"],
  xls: ["XLS", "bg-green-100 text-green-800"],
  xlsx: ["XLSX", "bg-green-100 text-green-800"],
  csv: ["CSV", "bg-amber-100 text-amber-800"],
  ppt: ["PPT", "bg-orange-100 text-orange-800"],
  pptx: ["PPTX", "bg-orange-100 text-orange-800"],

  // archives
  zip: ["ZIP", "bg-amber-100 text-amber-800"],
  rar: ["RAR", "bg-amber-100 text-amber-800"],
  "7z": ["7Z", "bg-amber-100 text-amber-800"],
  gz: ["GZ", "bg-amber-100 text-amber-800"],
  tar: ["TAR", "bg-amber-100 text-amber-800"],

  // audio
  mp3: ["AUDIO", "bg-violet-100 text-violet-800"],
  wav: ["AUDIO", "bg-violet-100 text-violet-800"],
  m4a: ["AUDIO", "bg-violet-100 text-violet-800"],
  flac: ["AUDIO", "bg-violet-100 text-violet-800"],
  aac: ["AUDIO", "bg-violet-100 text-violet-800"],
  ogg: ["AUDIO", "bg-violet-100 text-violet-800"],
  opus: ["AUDIO", "bg-violet-100 text-violet-800"],

  // video
  mp4: ["VIDEO", "bg-indigo-100 text-indigo-800"],
  mov: ["VIDEO", "bg-indigo-100 text-indigo-800"],
  webm: ["VIDEO", "bg-indigo-100 text-indigo-800"],
  mkv: ["VIDEO", "bg-indigo-100 text-indigo-800"],
  avi: ["VIDEO", "bg-indigo-100 text-indigo-800"],
  mpeg: ["VIDEO", "bg-indigo-100 text-indigo-800"],

  // design/source
  psd: ["PSD", "bg-fuchsia-100 text-fuchsia-800"],
  ai: ["AI", "bg-fuchsia-100 text-fuchsia-800"],
  eps: ["EPS", "bg-fuchsia-100 text-fuchsia-800"],
  indd: ["INDD", "bg-fuchsia-100 text-fuchsia-800"],
};

export function badgeFor(name = "", kind = "") {
  const ext = String(name || "").split(".").pop()?.toLowerCase() || "";

  // special handling for webm (audio vs video)
  if (ext === "webm") {
    if (kind === "audio") {
      return {
        label: "AUDIO",
        className:
          "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md bg-violet-100 text-violet-800",
      };
    }
    return {
      label: "VIDEO",
      className:
        "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md bg-indigo-100 text-indigo-800",
    };
  }

  // normal badge mapping
  if (ext && FILE_BADGE_MAP[ext]) {
    const [label, cls] = FILE_BADGE_MAP[ext];
    return {
      label,
      className: `inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md ${cls} dark:opacity-95`,
    };
  }

  // fallback by kind
  if (kind === "image") {
    return {
      label: "IMG",
      className:
        "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md bg-emerald-100 text-emerald-800",
    };
  }
  if (kind === "video") {
    return {
      label: "VIDEO",
      className:
        "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md bg-indigo-100 text-indigo-800",
    };
  }
  if (kind === "audio") {
    return {
      label: "AUDIO",
      className:
        "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md bg-violet-100 text-violet-800",
    };
  }

  return null;
}


export function badgeLabel(name = "", kind = "") {
  const b = badgeFor(name, kind);
  return b ? b.label : null;
}
