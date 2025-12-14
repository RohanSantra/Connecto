import multer from "multer";
import path from "path";

// Create a safe temp upload directory
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/temp");
    },
    filename: function (req, file, cb) {
        // Added timestamp or random suffix to prevent collisions
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

export const upload = multer({
    storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit per file
    }
});
