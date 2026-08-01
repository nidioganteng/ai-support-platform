import { readFile, unlink } from 'fs/promises';
import type { Job } from 'bullmq';
import { PDFParse } from 'pdf-parse';
import { prisma } from '@app/database';
import { getEnv } from '@app/shared';
import type { PdfProcessingJobData } from '../queues/pdf-processing.queue.js';

// ~500 tokens at ~4 chars/token
const CHUNK_CHARS = 2000;
const CHUNK_OVERLAP_CHARS = 200;

export interface PdfProcessingResult {
  chunkCount: number;
  embedded: boolean;
}

export function chunkText(text: string): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    const end = Math.min(start + CHUNK_CHARS, normalized.length);
    const chunk = normalized.slice(start, end).trim();
    if (chunk.length > 0) chunks.push(chunk);
    start += CHUNK_CHARS - CHUNK_OVERLAP_CHARS;
  }

  return chunks;
}

async function embedAndUpsert(
  chunks: string[],
  knowledgeSourceId: string,
  organizationId: string,
): Promise<boolean> {
  const env = getEnv();
  if (!env.OPENAI_API_KEY || !env.PINECONE_API_KEY) return false;

  const { default: OpenAI } = await import('openai');
  const { Pinecone } = await import('@pinecone-database/pinecone');

  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const pc = new Pinecone({ apiKey: env.PINECONE_API_KEY });
  const index = pc.index(env.PINECONE_INDEX_NAME);

  const batchSize = 100;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);

    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: batch,
    });

    const records = embeddingRes.data.map((item, j) => ({
      id: `${knowledgeSourceId}-chunk-${i + j}`,
      values: item.embedding,
      metadata: {
        organizationId,
        sourceId: knowledgeSourceId,
        chunkIndex: i + j,
        text: batch[j] ?? '',
      },
    }));

    await index.namespace(organizationId).upsert({ records });
  }

  return true;
}

export async function processPdfJob(
  job: Job<PdfProcessingJobData>,
): Promise<PdfProcessingResult> {
  const { knowledgeSourceId, organizationId, filePath } = job.data;

  await prisma.knowledgeSource.update({
    where: { id: knowledgeSourceId, organizationId },
    data: { status: 'PROCESSING' },
  });

  try {
    const buffer = await readFile(filePath);

    const parser = new PDFParse({ data: buffer });
    const textResult = await parser.getText();
    await parser.destroy();

    const chunks = chunkText(textResult.text);

    let embedded = false;
    try {
      embedded = await embedAndUpsert(chunks, knowledgeSourceId, organizationId);
    } catch (embedErr) {
      const msg = embedErr instanceof Error ? embedErr.message : String(embedErr);
      await prisma.knowledgeSource.update({
        where: { id: knowledgeSourceId, organizationId },
        data: { errorMessage: `Embedding failed (chunks extracted): ${msg}` },
      });
    }

    await prisma.knowledgeSource.update({
      where: { id: knowledgeSourceId, organizationId },
      data: { status: 'READY', chunkCount: chunks.length },
    });

    await unlink(filePath).catch(() => undefined);

    return { chunkCount: chunks.length, embedded };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    await prisma.knowledgeSource.update({
      where: { id: knowledgeSourceId, organizationId },
      data: { status: 'FAILED', errorMessage },
    });
    throw err;
  }
}
