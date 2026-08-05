import { describe, expect, it, vi, beforeEach } from 'vitest';
import { chunkText, embedAndUpsert, processPdfJob } from './pdf-processing.job.js';

vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue(Buffer.from('PDF content mock')),
  unlink: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('pdf-parse', () => ({
  PDFParse: vi.fn().mockImplementation(() => ({
    getText: vi.fn().mockResolvedValue({ text: 'Extracted PDF text for testing chunks.' }),
    destroy: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    embeddings: {
      create: vi.fn().mockResolvedValue({
        data: [{ embedding: [0.1, 0.2, 0.3] }],
      }),
    },
  })),
}));

vi.mock('@pinecone-database/pinecone', () => ({
  Pinecone: vi.fn().mockImplementation(() => ({
    index: vi.fn().mockReturnValue({
      namespace: vi.fn().mockReturnValue({
        upsert: vi.fn().mockResolvedValue({}),
      }),
    }),
  })),
}));

vi.mock('@app/database', () => ({
  prisma: {
    knowledgeSource: {
      update: vi.fn().mockResolvedValue({ id: 'ks-1' }),
    },
  },
}));

vi.mock('@app/shared', () => ({
  getEnv: vi.fn().mockReturnValue({
    DATABASE_URL: 'postgresql://test',
    REDIS_URL: 'redis://test',
    AI_PROVIDER: 'openai',
    OPENAI_API_KEY: 'sk-mock-openai',
    PINECONE_API_KEY: 'mock-pinecone',
    PINECONE_INDEX_NAME: 'test-index',
  }),
}));

import { prisma } from '@app/database';
import { getEnv } from '@app/shared';

describe('chunkText', () => {
  it('returns a single chunk for short text', () => {
    const text = 'Hello world';
    const chunks = chunkText(text);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe('Hello world');
  });

  it('returns empty array for blank text', () => {
    expect(chunkText('')).toHaveLength(0);
    expect(chunkText('   ')).toHaveLength(0);
  });

  it('normalizes whitespace before chunking', () => {
    const text = 'Hello   \n\n  world';
    const chunks = chunkText(text);
    expect(chunks[0]).toBe('Hello world');
  });

  it('splits long text into overlapping chunks', () => {
    const word = 'word ';
    const text = word.repeat(500);
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(2000);
    }
  });

  it('produces overlap between consecutive chunks', () => {
    const word = 'x';
    const text = word.repeat(2500);
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
  });
});

describe('embedAndUpsert', () => {
  it('returns false when API keys are missing', async () => {
    vi.mocked(getEnv).mockReturnValueOnce({
      DATABASE_URL: 'postgresql://test',
      REDIS_URL: 'redis://test',
      AI_PROVIDER: 'openai',
      OPENAI_API_KEY: null,
      PINECONE_API_KEY: null,
    } as any);
    const result = await embedAndUpsert(['test chunk'], 'ks-1', 'org-1');
    expect(result).toBe(false);
  });

  it('embeds text and upserts to Pinecone successfully', async () => {
    const result = await embedAndUpsert(['test chunk'], 'ks-1', 'org-1');
    expect(result).toBe(true);
  });
});

describe('processPdfJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('processes PDF job successfully and updates database status', async () => {
    const mockJob = {
      data: {
        knowledgeSourceId: 'ks-1',
        organizationId: 'org-1',
        filePath: '/tmp/test.pdf',
      },
    } as any;

    const result = await processPdfJob(mockJob);

    expect(result).toEqual({ chunkCount: 1, embedded: true });
    expect(prisma.knowledgeSource.update).toHaveBeenCalledWith({
      where: { id: 'ks-1', organizationId: 'org-1' },
      data: { status: 'PROCESSING' },
    });
    expect(prisma.knowledgeSource.update).toHaveBeenCalledWith({
      where: { id: 'ks-1', organizationId: 'org-1' },
      data: { status: 'READY', chunkCount: 1 },
    });
  });

  it('captures embedding errors without throwing process failure', async () => {
    vi.mocked(getEnv).mockReturnValueOnce({
      DATABASE_URL: 'postgresql://test',
      REDIS_URL: 'redis://test',
      AI_PROVIDER: 'openai',
      OPENAI_API_KEY: 'invalid_key',
      PINECONE_API_KEY: 'mock-pinecone',
      PINECONE_INDEX_NAME: 'test-index',
    } as any);

    const { default: OpenAI } = await import('openai');
    vi.mocked(OpenAI).mockImplementationOnce(() => ({
      embeddings: {
        create: vi.fn().mockRejectedValue(new Error('API quota exceeded')),
      },
    } as any));

    const mockJob = {
      data: {
        knowledgeSourceId: 'ks-1',
        organizationId: 'org-1',
        filePath: '/tmp/test.pdf',
      },
    } as any;

    const result = await processPdfJob(mockJob);
    expect(result.embedded).toBe(false);
    expect(prisma.knowledgeSource.update).toHaveBeenCalledWith({
      where: { id: 'ks-1', organizationId: 'org-1' },
      data: { errorMessage: expect.stringContaining('API quota exceeded') },
    });
  });

  it('handles PDF parsing failure gracefully', async () => {
    const { readFile } = await import('fs/promises');
    vi.mocked(readFile).mockRejectedValueOnce(new Error('Corrupted PDF file'));

    const mockJob = {
      data: {
        knowledgeSourceId: 'ks-1',
        organizationId: 'org-1',
        filePath: '/tmp/bad.pdf',
      },
    } as any;

    await expect(processPdfJob(mockJob)).rejects.toThrow('Corrupted PDF file');

    expect(prisma.knowledgeSource.update).toHaveBeenCalledWith({
      where: { id: 'ks-1', organizationId: 'org-1' },
      data: { status: 'FAILED', errorMessage: 'Corrupted PDF file' },
    });
  });
});
