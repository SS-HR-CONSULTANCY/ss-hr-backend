import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../../public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // Replace spaces with underscores for safer URLs
        const safeOriginalName = file.originalname.replace(/\s+/g, '_');
        cb(null, file.fieldname + '-' + uniqueSuffix + '-' + safeOriginalName);
    }
});

export const uploadSettings = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});
