import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import cloudinaryPkg from 'cloudinary';
import multerCloudinaryPkg from 'multer-storage-cloudinary';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { v2: cloudinary } = cloudinaryPkg;
const { CloudinaryStorage } = multerCloudinaryPkg;

// ── Cloudinary (production) ────────────────────────────────────────────────
const hasCloudinary =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY    &&
  process.env.CLOUDINARY_API_SECRET;

let storage;

if (hasCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder:          process.env.CLOUDINARY_FOLDER || 'skillhub',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation:  [{ width: 1200, crop: 'limit' }],
    },
  });

  console.log('[upload] Using Cloudinary storage');
} else {
  // ── Local disk fallback (development) ────────────────────────────────────
  const uploadDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const ext  = path.extname(file.originalname).toLowerCase() || '.jpg';
      const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      cb(null, name);
    },
  });

  console.log('[upload] Cloudinary not configured — using local disk storage (uploads/)');
}

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    if (allowed.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only JPG, PNG and WebP images are allowed'));
  },
});

export function fileUrl(file) {
  if (!file) return null;
  if (hasCloudinary) return file.path;
  return `/uploads/${path.basename(file.path)}`;
}
