import { Router } from "express"
import multer from "multer"
import AWS from "aws-sdk"

const router = Router()

// router.use((err: any, req: any, res: any, next: any) => {
//     if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
//         return res.status(413).send('File too large!');
//     }
//     next(err);
// })

// Configure AWS SDK for DigitalOcean Spaces
const s3 = new AWS.S3({
  endpoint: process.env.BUCKET_END_POINT, 
  accessKeyId: process.env.BUCKET_ACCESS_KEY,
  secretAccessKey: process.env.BUCKET_SECRET_ACCESS_KEY
})

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
    storage: process.env.NODE_ENV === "production" ? multer.memoryStorage() : storage,
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

        const params = {
            Bucket: process.env.BUCKET_NAME ?? "",
            Key: Date.now() + '-' + req.file.originalname, // Unique file name
            Body: req.file.buffer, // The file buffer from Multer
            ACL: 'public-read', // Makes the file publicly accessible (adjust as needed)
            ContentType: req.file.mimetype
        }
        if(process.env.NODE_ENV !== "production"){  
            await s3.upload(params).promise()
        }

        const cdnEndpoint = `${process.env.BUCKET_NAME}.${process.env.BUCKET_END_POINT}`

        res.status(201).json({
            message: "File uploaded successfully!",
            data: {
                filename: process.env.NODE_ENV === "production" ? params.Key : req.file?.filename,
                url: process.env.NODE_ENV === "production" ? `https://${cdnEndpoint}/${req.file?.filename}` : `/uploads/${req.file?.filename}`,
                mimeType: req.file?.mimetype,
                size: req.file?.size,
                path: req.file?.path
            }
        })
    } catch (error) {
        console.log(error)
        res.status(500).send("Failed to upload file.")
    }
})

export default router