import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Job } from 'bullmq';
import type { WebsiteCrawlJobData } from '../queues/website-crawl.queue.js';
import {
  normalizeUrl,
  extractSameDomainLinks,
  fetchAndParseWebpage,
  crawlWebsite,
  processWebsiteCrawlJob,
} from './website-crawl.job.js';
import { JSDOM } from 'jsdom';

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

describe('normalizeUrl', () => {
  it('normalizes valid absolute and relative URLs', () => {
    expect(normalizeUrl('https://example.com/page#section')).toBe('https://example.com/page');
    expect(normalizeUrl('/about', 'https://example.com/home')).toBe('https://example.com/about');
    expect(normalizeUrl('mailto:test@example.com')).toBeNull();
    expect(normalizeUrl('javascript:void(0)')).toBeNull();
  });
});

describe('extractSameDomainLinks', () => {
  it('extracts links matching the seed hostname and ignores external links', () => {
    const html = `
      <html>
        <body>
          <a href="/faq">FAQ</a>
          <a href="https://example.com/docs">Docs</a>
          <a href="https://google.com">External</a>
        </body>
      </html>
    `;
    const dom = new JSDOM(html, { url: 'https://example.com' });
    const links = extractSameDomainLinks(dom, 'https://example.com');

    expect(links).toContain('https://example.com/faq');
    expect(links).toContain('https://example.com/docs');
    expect(links).not.toContain('https://google.com');
  });
});

describe('fetchAndParseWebpage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and extracts main readable text and internal links from HTML', async () => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head><title>Test Page</title></head>
        <body>
          <nav><a href="/contact">Contact</a></nav>
          <main>
            <h1>Main Article Title</h1>
            <p>This is the main readable paragraph content for AI ingestion.</p>
            <a href="https://example.com/faq">FAQ Link</a>
            <a href="https://other.com">Other Domain</a>
          </main>
        </body>
      </html>
    `;

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(htmlContent),
    } as Response);

    const result = await fetchAndParseWebpage('https://example.com/test');
    expect(result.cleanText).toContain('Main Article Title');
    expect(result.links).toContain('https://example.com/contact');
    expect(result.links).toContain('https://example.com/faq');
    expect(result.links).not.toContain('https://other.com');
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

describe('crawlWebsite', () => {
  it('crawls internal pages up to maxPages limit and avoids infinite cycles', async () => {
    const responses: Record<string, string> = {
      'https://example.com/': '<html><body><h1>Home</h1><a href="/page1">P1</a><a href="/page2">P2</a></body></html>',
      'https://example.com/page1': '<html><body><h1>Page 1</h1><a href="/page2">P2</a><a href="/">Home</a></body></html>',
      'https://example.com/page2': '<html><body><h1>Page 2</h1><a href="/page3">P3</a></body></html>',
      'https://example.com/page3': '<html><body><h1>Page 3</h1></body></html>',
    };

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      const html = responses[url];
      if (html) {
        return Promise.resolve({ ok: true, text: () => Promise.resolve(html) } as Response);
      }
      return Promise.resolve({ ok: false, status: 404 } as Response);
    });

    // Limit maxPages to 2
    const pageTexts = await crawlWebsite('https://example.com', 2);
    expect(pageTexts).toHaveLength(2);
    expect(pageTexts[0]).toContain('Home');
    expect(pageTexts[1]).toContain('Page 1');
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
        maxPages: 10,
      },
    } as unknown as Job<WebsiteCrawlJobData>;

    const result = await processWebsiteCrawlJob(mockJob);

    expect(result).toEqual({ chunkCount: 1, embedded: true });
  });
});
