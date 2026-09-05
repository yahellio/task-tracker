import multer from 'multer';

export const ATTACHMENTS_FIELD = 'attachments';

export const createUploadMiddleware = ({ maxFileSizeBytes, maxFilesPerRequest }) =>
  multer({
    storage: multer.memoryStorage(),
    defParamCharset: 'utf8',
    limits: { fileSize: maxFileSizeBytes, files: maxFilesPerRequest }
  }).array(ATTACHMENTS_FIELD, maxFilesPerRequest);

export const takeUploads = (req) =>
  (req.files ?? []).map((file) => ({
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    content: file.buffer
  }));
