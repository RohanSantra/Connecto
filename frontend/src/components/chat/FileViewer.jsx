"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

export default function FileViewer({ file, onClose }) {
    if (!file) return null;

    /* ------------------ FILE METADATA ------------------ */
    const url =
        file?.cloudinary?.secure_url ||
        file?.cloudinary?.url ||
        file?.url ||
        "";

    const filename = file.filename || "file";
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    const mime = file.mimeType || "";

    const isPDF = ext === "pdf";
    const isText = ["txt", "json", "csv"].includes(ext) || mime.startsWith("text/");
    const isDoc = ["doc", "docx"].includes(ext);
    const isSheet = ["xls", "xlsx"].includes(ext);
    const isPPT = ["ppt", "pptx"].includes(ext);
    const isZip = ["zip", "rar", "7z", "tar"].includes(ext);

    const [textContent, setTextContent] = useState("");

    /* ---------------- TEXT PREVIEW FETCH ---------------- */
    useEffect(() => {
        if (isText) {
            fetch(url)
                .then((r) => r.text())
                .then(setTextContent)
                .catch(() => setTextContent("Unable to preview this file."));
        }
    }, [isText, url]);

    /* ---------------- OFFICE VIEWER URL ---------------- */
    const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
        url
    )}`;

    /* ---------------------- UI ------------------------- */
    return (
        <div className="fixed inset-0 z-9999 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
            <div className="relative w-full h-full sm:h-[90vh] sm:w-[90vw] max-w-4xl bg-background rounded-xl shadow-xl border overflow-hidden">

                {/* ✖ CLOSE BUTTON */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 z-20 bg-background/70 rounded-full p-1 shadow hover:bg-muted"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* ---------------- PDF VIEWER ---------------- */}
                {isPDF && (
                    <embed
                        src={`${url}#toolbar=1&navpanes=0&zoom=page-width`}
                        type="application/pdf"
                        className="w-full h-full"
                    />
                )}

                {/* ---------------- TEXT / JSON VIEWER ---------------- */}
                {isText && (
                    <pre className="w-full h-full p-4 sm:p-6 overflow-auto whitespace-pre-wrap text-sm scroll-thumb-only">
                        {textContent}
                    </pre>
                )}

                {/* ---------------- DOC / EXCEL / PPT VIEWER ---------------- */}
                {(isDoc || isSheet || isPPT) && (
                    <iframe
                        src={officeViewerUrl}
                        className="w-full h-full"
                        title="Document Viewer"
                        allowFullScreen
                    />
                )}

                {/* ---------------- ZIP / RAR / 7Z ---------------- */}
                {isZip && (
                    <div className="flex flex-col items-center justify-center text-center h-full p-6">
                        <p className="text-sm text-muted-foreground mb-3">
                            Preview not supported for compressed files.
                        </p>

                        <a
                            href={url}
                            download
                            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground shadow hover:bg-primary/90 text-sm"
                        >
                            Download File
                        </a>
                    </div>
                )}

                {/* ---------------- FALLBACK ---------------- */}
                {!isPDF &&
                    !isText &&
                    !isDoc &&
                    !isSheet &&
                    !isPPT &&
                    !isZip && (
                        <iframe
                            src={url}
                            className="w-full h-full"
                            title="File Preview"
                        />
                )}
            </div>
        </div>
    );
}
