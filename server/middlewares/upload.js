const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
const path = require("path");

// Configure Cloudinary if credentials exist
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

const storage = process.env.CLOUDINARY_CLOUD_NAME
  ? new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: "equiprent", // Folder name in Cloudinary
        allowedFormats: ["jpg", "png", "jpeg", "webp"]
      }
    })
  : multer.diskStorage({
      // Fallback to local storage if Cloudinary is not configured
      destination: (req, file, cb) => cb(null, "uploads/"),
      filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
    });

const upload = multer({ storage });

module.exports = upload;
