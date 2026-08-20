const express = require('express');
const { uploadFile, searchFiles, getFileById } = require('../controllers/fileController');
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

router.use(protect);

/**
 * @openapi
 * /api/files/upload:
 *   post:
 *     summary: Upload a multimedia file to Cloudinary and store its metadata
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *               name: { type: string }
 *               tags: { type: string, description: "Comma-separated tags" }
 *     responses:
 *       201: { description: File uploaded }
 *       400: { description: Invalid file type/size or missing file }
 *       401: { description: Not authorized }
 */
router.post('/upload', upload.single('file'), uploadFile);

/**
 * @openapi
 * /api/files/search:
 *   get:
 *     summary: Search uploaded files, ranked by relevance/popularity/recency
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema: { type: string }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [image, video, audio, pdf] }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Ranked search results }
 *       401: { description: Not authorized }
 */
router.get('/search', searchFiles);

/**
 * @openapi
 * /api/files/{id}:
 *   get:
 *     summary: Get a single file by id (increments its view count)
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: File found }
 *       404: { description: File not found }
 */
router.get('/:id', getFileById);

module.exports = router;
