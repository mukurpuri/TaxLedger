import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Request } from 'express';
import { Router } from 'express';
import multer from 'multer';
import { env } from '../config/env';
import { requireAuth, requireUser } from '../auth/authGuard';
import { prisma } from '../db/client';
import { getFiling } from '../filing/filingRepository';
import { asyncHandler } from '../middleware/asyncHandler';
import { ForbiddenError, ValidationError } from '../shared/errors';
import { logger } from '../shared/logger';
import { DocumentUploadSchema } from '../shared/schemas';

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const uploadRoot = path.resolve(env.UPLOAD_DIR);

function ensureUploadRoot(): void {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      ensureUploadRoot();
      cb(null, uploadRoot);
    } catch (err) {
      cb(err as Error, uploadRoot);
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || mimeToExt(file.mimetype);
    cb(null, `${Date.now()}-${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new ValidationError('Only PDF, JPEG, PNG, and WebP files are accepted'));
      return;
    }
    cb(null, true);
  },
});

function mimeToExt(mime: string): string {
  switch (mime) {
    case 'application/pdf':
      return '.pdf';
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    default:
      return '';
  }
}

function filingIdParam(req: Request): string {
  const id = req.params.id;
  if (!id) {
    throw new ValidationError('Filing id is required');
  }
  return id;
}

export async function handleDocumentUpload(req: Request) {
  const { userId } = requireUser(req);
  const filingId = filingIdParam(req);
  const filing = await getFiling(filingId);
  if (filing.userId !== userId) {
    throw new ForbiddenError('You cannot attach documents to another taxpayer\'s filing');
  }

  const parsed = DocumentUploadSchema.safeParse({
    type: req.body?.type,
    filingId,
  });
  if (!parsed.success) {
    throw new ValidationError('Invalid document metadata', { issues: parsed.error.flatten() });
  }
  if (!req.file) {
    throw new ValidationError('A file field named "file" is required');
  }

  const fileUrl = path.posix.join(env.UPLOAD_DIR.replace(/\\/g, '/'), req.file.filename);
  try {
    const document = await prisma.document.create({
      data: {
        filingId,
        type: parsed.data.type,
        fileUrl,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
      },
    });

    return {
      id: document.id,
      filingId: document.filingId,
      type: document.type,
      fileUrl: document.fileUrl,
      fileName: document.fileName,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
      uploadedAt: document.uploadedAt,
    };
  } catch (err) {
    logger.error('Failed to persist uploaded document', {
      filingId,
      err: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

export const documentRouter = Router();

documentRouter.post(
  '/filings/:id/documents',
  requireAuth,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const document = await handleDocumentUpload(req);
    res.status(201).json({ document });
  }),
);
