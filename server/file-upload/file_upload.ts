import { Router } from "express"
import multer from "multer"

const router = Router()

// router.use((err: any, req: any, res: any, next: any) => {
//     if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
//         return res.status(413).send('File too large!');
//     }
//     next(err);
// })

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/')
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname); // Unique filename
    }
})

const fileFilter = (req: any, file: any, cb: any) => {
  // Check file type based on MIME type
  if (file.mimetype === 'image/png' || file.mimetype === 'image/svg+xml') {
    cb(null, true); // Accept the file
  } else {
    cb(new Error('Invalid file type. Only PNG and SVG are allowed.'), false); // Reject the file
  }
}

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 10 // Limit file size to 10MB
    },
    fileFilter: fileFilter
})

router.post("/upload", upload.single('file'), async (req, res) => {
    try {
        if(!req.file){
            return res.status(400).json({ message: 'No file uploaded' });
        }
        res.status(201).json({
            message: "File uploaded successfully!",
            data: {
                filename: req.file?.filename,
                mimeType: req.file?.mimetype,
                size: req.file?.size,
                path: req.file?.path
            }
        })
    } catch (error) {
        res.status(500).send("Failed to upload file.")
    }
})

export default router