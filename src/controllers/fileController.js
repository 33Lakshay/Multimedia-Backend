const { Readable } = require('stream');
const cloudinary = require('../config/cloudinary');
const File = require('../models/File');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ALLOWED_MIME_TYPES } = require('../middleware/upload');
const { rankFiles } = require('../utils/ranking');

const uploadBufferToCloudinary = (buffer, resourceType) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: resourceType, folder: 'multimedia-search' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });

const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'No file provided');
  }

  const fileType = ALLOWED_MIME_TYPES[req.file.mimetype];
  const resourceType = fileType === 'video' || fileType === 'audio' ? 'video' : 'auto';

  const result = await uploadBufferToCloudinary(req.file.buffer, resourceType);

  const tags = (req.body.tags || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const file = await File.create({
    name: req.body.name || req.file.originalname,
    url: result.secure_url,
    publicId: result.public_id,
    mimeType: req.file.mimetype,
    fileType,
    size: req.file.size,
    tags,
    uploadedBy: req.user._id,
  });

  res.status(201).json({ success: true, file });
});

const searchFiles = asyncHandler(async (req, res) => {
  const { query = '', type, from, to } = req.query;

  const filter = {};
  if (type) filter.fileType = type;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  if (query.trim()) {
    const regex = new RegExp(query.trim(), 'i');
    filter.$or = [{ name: regex }, { tags: regex }];
  }

  const files = await File.find(filter).limit(200);
  const ranked = rankFiles(files, query);

  res.status(200).json({ success: true, count: ranked.length, results: ranked });
});

const getFileById = asyncHandler(async (req, res) => {
  const file = await File.findByIdAndUpdate(
    req.params.id,
    { $inc: { viewCount: 1 } },
    { new: true }
  );

  if (!file) {
    throw new ApiError(404, 'File not found');
  }

  res.status(200).json({ success: true, file });
});

module.exports = { uploadFile, searchFiles, getFileById };
