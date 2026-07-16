const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure upload directory
const uploadDir = path.join(__dirname, '../../uploads');

// Ensure directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage engine configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate secure and unique filename: fieldname-timestamp-random.ext
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

// File filter (allowing images and PDFs)
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext) && allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Formato de archivo no válido para el campo ${file.fieldname}. Solo se admiten PDFs e imágenes (JPEG, PNG, WEBP).`), false);
  }
};

// Multer upload configurations
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // Limit files to 10MB each
  }
});

// Fields to be accepted by the endpoint
const uploadFields = upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'rut_doc', maxCount: 1 },
  { name: 'id_doc', maxCount: 1 },
  { name: 'chamber_of_commerce_doc', maxCount: 1 }
]);

module.exports = {
  uploadFields
};
