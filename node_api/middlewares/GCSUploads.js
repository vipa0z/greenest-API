// middleware/gcsUpload.js
const { Storage } = require('@google-cloud/storage');
const multer = require('multer');
const path = require('path');
const util = require('util');

require('dotenv').config();

// --- Configuration (Keep as before) ---
const GCS_PROJECT_ID = process.env.GCS_PROJECT_ID;
const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME;
const GCS_KEYFILE_PATH = process.env.GCS_KEYFILE_PATH;

if (!GCS_PROJECT_ID || !GCS_BUCKET_NAME || !GCS_KEYFILE_PATH) {
    console.error('Missing GCS environment variables (PROJECT_ID, BUCKET_NAME, KEYFILE_PATH)');
    process.exit(1); // Exit if essential config is missing
}

// --- Initialize Google Cloud Storage (Keep as before) ---
let storage;
try {
    storage = new Storage({
        projectId: GCS_PROJECT_ID,
        keyFilename: GCS_KEYFILE_PATH,
    });
} catch (err) {
    console.error('Failed to initialize Google Cloud Storage:', err);
    process.exit(1);
}

const bucket = storage.bucket(GCS_BUCKET_NAME);

// --- Configure Multer (Keep as before) ---
const multerMemory = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const mimetype = allowedTypes.test(file.mimetype);
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error(`File upload only supports the following filetypes: ${allowedTypes}`), false);
    },
});

/**
 * @param {string} fieldName - The name of the form field (e.g., 'plantImage', 'profilePic').
 * @param {string} baseFolderType - The base folder name ('plants', 'profiles'). No trailing slash needed.
 * @returns {Function} Express middleware function.
 */
function uploadToGcsUserSpecific(fieldName, baseFolderType) {
    // Returns the actual middleware handler
    return (req, res, next) => {
        // 1. Use multerMemory.single first
        const upload = multerMemory.single(fieldName);

        upload(req, res, (multerError) => {
            if (multerError) {
                console.error('Multer error:', multerError);
                if (multerError.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ message: 'File size exceeds the 10MB limit.' });
                }
                 if (multerError instanceof Error && multerError.message.startsWith('File upload only supports')) {
                     return res.status(400).json({ message: multerError.message });
                }
                return res.status(500).json({ message: 'Error processing file upload.', error: multerError.message });
            }

            // 2. Check if a file was uploaded
            if (!req.file) {
                // If file is optional, proceed. If required, handle accordingly.
                 // return res.status(400).json({ message: `No file uploaded for field '${fieldName}'.` });
                 return next();
            }

            // --- *** CHANGE: Get User ID and Construct Dynamic Path *** ---
            const userId = req.user?.userId; // Assumes auth middleware adds req.user = { id: '...' }

            if (!userId) {
                // If userId is missing, it's an internal server error or auth issue.
                console.error('User ID not found on request object (req.user.userId). Ensure authentication middleware runs first.');
                // Send an appropriate error. 401/403 might be suitable depending on context.
                return res.status(401).json({ message: 'Unauthorized: User ID not found for upload.' });
                // Alternatively, pass an error to the global handler:
                // return next(new Error('User ID not found for upload.'));
            }

            // 3. Prepare file for GCS upload with user-specific path
            const originalName = req.file.originalname;
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            // Construct the path: baseFolderType/userId/uniqueFilename
            const gcsFileName = `${baseFolderType}/${userId}/${uniqueSuffix}-${originalName.replace(/\s+/g, '_')}`;

            const blob = bucket.file(gcsFileName);
            const blobStream = blob.createWriteStream({
                resumable: false,
            });

            blobStream.on('error', (gcsError) => {
                console.error(`GCS upload error for ${gcsFileName}:`, gcsError);
                req.file.gcsError = gcsError;
                next(gcsError); // Pass error to Express error handler
            });

            blobStream.on('finish', async () => {
                console.log(`GCS Upload Successful: ${gcsFileName}`);
                try {
                    // Optional: Make public (adjust as needed)
                    await blob.makePublic();
                    
                    // Use the gcsFileName which already includes baseFolderType/userId/
                    const publicUrl = `https://storage.googleapis.com/${GCS_BUCKET_NAME}/${gcsFileName}`;

                    // Attach GCS info to request
                    req.file.gcsUrl = publicUrl;
                    req.file.gcsFilename = gcsFileName; // Full path in bucket
                    req.file.gcsBucket = GCS_BUCKET_NAME;
                    // Attach userId if needed downstream (already available via req.user.userId usually)
                    // req.file.userId = userId; 

                    next(); // Proceed to the next handler
                } catch (publicError) {
                    console.error(`Error making file public (${gcsFileName}):`, publicError);
                    req.file.gcsError = publicError;
                    // Decide handling: is a non-public file still okay?
                    next(publicError); // Pass error if public access is critical
                }
            });

            // 5. Pipe file buffer to GCS (Keep as before)
            blobStream.end(req.file.buffer);
        });
    };
}

// Export the new function
module.exports = uploadToGcsUserSpecific;