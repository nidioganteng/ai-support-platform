import { Router, type Request, type Response, type NextFunction } from 'express';
import { getAuth } from '@clerk/express';
import multer from 'multer';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdirSync } from 'fs';
import { Queue } from 'bullmq';
import { prisma } from '@app/database';
import { getRedisConnectionOptions } from '../connection.js';

interface PdfProcessingJobData {
  knowledgeSourceId: string;
  organizationId: string;
  filePath: string;
  originalFileName: string;
}

export const knowledgeSourcesRouter: Router = Router();

const UPLOADS_DIR = join(tmpdir(), 'ai-support-uploads');
mkdirSync(UPLOADS_DIR, { recursive: true });

const PDF_PROCESSING_QUEUE_NAME = 'pdf-processing';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are accepted'));
    }
  },
});

function requireOrgAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

function getPdfQueue(): Queue<PdfProcessingJobData> {
  return new Queue<PdfProcessingJobData>(PDF_PROCESSING_QUEUE_NAME, {
    connection: getRedisConnectionOptions(),
  });
}

knowledgeSourcesRouter.post(
  '/upload',
  requireOrgAuth,
  upload.single('file'),
  async (req: Request, res: Response) => {
    const { orgSlug } = getAuth(req);

    if (!orgSlug) {
      res.status(403).json({ error: 'No active organization selected' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const { orgId } = getAuth(req);
    const org = await prisma.organization.upsert({
      where: { slug: orgSlug },
      create: { slug: orgSlug, name: orgId ?? orgSlug },
      update: {},
    });

    const source = await prisma.knowledgeSource.create({
      data: {
        organizationId: org.id,
        type: 'PDF',
        status: 'PENDING',
        title: req.file.originalname.replace(/\.pdf$/i, ''),
        originalFileName: req.file.originalname,
      },
    });

    const queue = getPdfQueue();
    await queue.add(
      'process-pdf',
      {
        knowledgeSourceId: source.id,
        organizationId: org.id,
        filePath: req.file.path,
        originalFileName: req.file.originalname,
      } satisfies PdfProcessingJobData,
      { removeOnComplete: 20, removeOnFail: 20 },
    );
    await queue.close();

    res.status(201).json(source);
  },
);

knowledgeSourcesRouter.get(
  '/',
  requireOrgAuth,
  async (req: Request, res: Response) => {
    const { orgSlug } = getAuth(req);

    if (!orgSlug) {
      res.status(403).json({ error: 'No active organization selected' });
      return;
    }

    const { orgId } = getAuth(req);
    const org = await prisma.organization.upsert({
      where: { slug: orgSlug },
      create: { slug: orgSlug, name: orgId ?? orgSlug },
      update: {},
    });

    const sources = await prisma.knowledgeSource.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json(sources);
  },
);

// Catch multer and other sync errors from this router — always return JSON
knowledgeSourcesRouter.use(
  (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const msg = err instanceof Error ? err.message : 'Unexpected error';
    res.status(400).json({ error: msg });
  },
);
