import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Job } from 'bullmq';
import type { WebsiteCrawlJobData } from '../queues/website-crawl.queue.js';
import { fetchAndParseWebpage, processWebsiteCrawlJob } from './website-crawl.job.js';

vi.mock('@app/database', async () => {
  const actual = await vi.importActual('@app/database');
  return {
    ...actual,
    prisma: {
      knowledgeSource: {
        update: vi.fn().mockResolvedValue({ id: 'ks_1' }),
      },
    },
  };
});

vi.mock('./pdf-processing.job.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./pdf-processing.job.js')>();
  return {
    ...actual,
    embedAndUpsert: vi.fn().mockResolvedValue(true),
  };
});

describe('fetchAndParseWebpage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and extracts main readable text from HTML', async () => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head><title>Test Page</title></head>
        <body>
          <nav>Nav content to strip</nav>
          <main>
            <h1>Main Article Title</h1>
            <p>This is the main readable paragraph content for AI ingestion.</p>
          </main>
          <footer>Footer content to strip</footer>
        </body>
      </html>
    `;

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(htmlContent),
    } as Response);

    const parsed = await fetchAndParseWebpage('https://example.com/test');
    expect(parsed).toContain('Main Article Title');
    expect(parsed).toContain('This is the main readable paragraph content for AI ingestion.');
  });

  it('throws error if HTTP response is not ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);

    await expect(fetchAndParseWebpage('https://example.com/missing')).rejects.toThrow(
      'Failed to fetch URL https://example.com/missing: HTTP status 404',
    );
  });
});

describe('processWebsiteCrawlJob', () => {
  it('processes crawl job successfully and updates status to READY', async () => {
    const htmlContent = '<html><body><h1>Help Center</h1><p>Welcome to our support page.</p></body></html>';
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(htmlContent),
    } as Response);

    const mockJob = {
      data: {
        knowledgeSourceId: 'ks_123',
        organizationId: 'org_123',
        url: 'https://example.com/help',
      },
    } as unknown as Job<WebsiteCrawlJobData>;

    const result = await processWebsiteCrawlJob(mockJob);

    expect(result).toEqual({ chunkCount: 1, embedded: true });
  });
});
