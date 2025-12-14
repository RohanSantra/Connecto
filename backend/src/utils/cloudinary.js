import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

// =====================================================
// 🧩 CLOUDINARY CONFIG
// =====================================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// =====================================================
// 1️⃣ UPLOAD SINGLE FILE
// =====================================================
export const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;


    const isDocument = /\.(pdf|docx?|xlsx?|pptx?|txt)$/i.test(path);

    const uploaded = await cloudinary.uploader.upload(path, {
      resource_type: isDocument ? "raw" : "auto",
      type: "upload"
    });

    fs.unlinkSync(localFilePath); // remove temp file
    return uploaded;
  } catch (error) {
    console.error("❌ Cloudinary upload failed:", error);
    try {
      fs.unlinkSync(localFilePath); // cleanup
    } catch { }
    return null;
  }
};

// =====================================================
// 2️⃣ UPLOAD MULTIPLE FILES (optional helper)
// =====================================================
export const uploadMultipleOnCloudinary = async (localFilePaths = []) => {
  try {
    if (!Array.isArray(localFilePaths) || localFilePaths.length === 0) return [];

    const results = [];
    for (const path of localFilePaths) {
      const isDocument = /\.(pdf|docx?|xlsx?|pptx?|txt)$/i.test(path);

      const uploaded = await cloudinary.uploader.upload(path, {
        resource_type: isDocument ? "raw" : "auto",
        type: "upload"
      });
      results.push(uploaded);
      fs.unlinkSync(path);
    }

    return results;
  } catch (error) {
    console.error("❌ Failed to upload multiple files:", error);
    for (const path of localFilePaths) {
      try {
        fs.unlinkSync(path);
      } catch { }
    }
    return [];
  }
};

// =====================================================
// 3️⃣ DELETE SINGLE FILE
// =====================================================
export const deleteFromCloudinary = async (fileUrl) => {
  try {
    if (!fileUrl) return null;
    const publicId = fileUrl.split("/").pop().split(".")[0];
    const res = await cloudinary.uploader.destroy(publicId);
    console.log(`🗑️ Deleted file: ${publicId}`);
    return res;
  } catch (error) {
    console.error("❌ Cloudinary delete failed:", error);
    return null;
  }
};

// =====================================================
// 4️⃣ DELETE MULTIPLE FILES (optional helper)
// =====================================================
export const deleteMultipleFromCloudinary = async (urls = []) => {
  try {
    if (!Array.isArray(urls) || urls.length === 0) return [];

    const publicIds = urls.map((url) => url.split("/").pop().split(".")[0]);
    const results = [];

    for (const id of publicIds) {
      const res = await cloudinary.uploader.destroy(id);
      results.push({ id, result: res.result });
    }

    console.log("✅ Batch delete results:", results);
    return results;
  } catch (error) {
    console.error("❌ Batch delete failed:", error);
    return [];
  }
};
