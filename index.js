// app.js
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure CORS
app.use(cors());
app.use(express.json());

// Configure Multer for memory storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  //if (file.mimetype === 'video/mp4') {
    cb(null, true);
  //} else {
    //cb(new Error('Only MP4 files are allowed'), false);
  //}
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
    // yeah its kinda ugly this goofy hack, but works, i guess
  }
});

// SHA256 naming
app.post('/upload', upload.single('video'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const hash = crypto
      .createHash('sha256')
      .update(req.file.buffer)
      .digest('hex');

    const filename = `${hash}.mp4`;
    const filePath = path.join(__dirname, 'uploads', filename);

    if (fs.existsSync(filePath)) {
      return res.status(409).json({ error: 'File already exists [with same SHA256]' });
    }

    // Save file to uploads/
    await fs.promises.writeFile(filePath, req.file.buffer);

    res.json({
      message: 'File uploaded successfully',
      filename: filename
    });
    console.log()
  } catch (err) {
    res.status(500).json({ error: 'Error processing file' });
  }
});

// Download endpoint
app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', filename);

  // Security checks
  /*if (path.extname(filename).toLowerCase() !== '.mp4') {
    return res.status(400).json({ error: 'Invalid file type' });
  }*/

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.download(filePath, (err) => {
    if (err) {
      res.status(500).json({ error: 'Error downloading file' });
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds 5MB limit' });
    }
    return res.status(400).json({ error: err.message });
  } else if (err) {
    return res.status(500).json({ error: err.message });
  }
  next();
});

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);

  console.log("Created uploads/")
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});