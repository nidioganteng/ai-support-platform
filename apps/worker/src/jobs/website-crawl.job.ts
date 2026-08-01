import type { Job } from 'bullmq';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { prisma } from '@app/database';
import type { WebsiteCrawlJobData } from '../queues/website-crawl.queue.js';
import { chunkText, embedAndUpsert } from './pdf-processing.job.js';

export interface WebsiteCrawlResult {
  chunkCount: number;
  embedded: boolean;
}

export interface WebpageParseResult {
  url: string;
  cleanText: string;
  links: string[];
}

export function normalizeUrl(urlStr: string, baseUrl?: string): string | null {
  try {
    const parsed = baseUrl ? new URL(urlStr, baseUrl) : new URL(urlStr);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return null;
  }
}

export function extractSameDomainLinks(dom: JSDOM, baseUrl: string): string[] {
  const seedHostname = new URL(baseUrl).hostname;
  const anchors = dom.window.document.querySelectorAll('a[href]');
  const found = new Set<string>();

  anchors.forEach((a) => {
    const href = a.getAttribute('href');
    if (!href) return;

    const normalized = normalizeUrl(href, baseUrl);
    if (normalized) {
      try {
        const u = new URL(normalized);
        if (u.hostname === seedHostname) {
          found.add(normalized);
        }
      } catch {
        // ignore invalid URLs
      }
    }
  });

  return Array.from(found);
}

export async function fetchAndParseWebpage(
  url: string,
  timeoutMs = 10000,
): Promise<WebpageParseResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'AISupportPlatform-Bot/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL ${url}: HTTP status ${response.status}`);
    }

    const html = await response.text();
    const dom = new JSDOM(html, { url });

    const links = extractSameDomainLinks(dom, url);

    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    const textContent = article?.textContent || dom.window.document.body?.textContent || '';
    const cleanText = textContent.replace(/\s+/g, ' ').trim();

    return { url, cleanText, links };
  } finally {
    clearTimeout(timer);
  }
}

export async function crawlWebsite(
  seedUrl: string,
  maxPages = 50,
  timeoutMs = 10000,
): Promise<string[]> {
  const normalizedSeed = normalizeUrl(seedUrl);
  if (!normalizedSeed) {
    throw new Error(`Invalid start URL: ${seedUrl}`);
  }

  const visited = new Set<string>();
  const queue: string[] = [normalizedSeed];
  const pageTexts: string[] = [];

  while (queue.length > 0 && visited.size < maxPages) {
    const currentUrl = queue.shift();
    if (!currentUrl || visited.has(currentUrl)) continue;

    visited.add(currentUrl);

    try {
      const pageResult = await fetchAndParseWebpage(currentUrl, timeoutMs);
      if (pageResult.cleanText) {
        pageTexts.push(`--- Source: ${currentUrl} ---\n${pageResult.cleanText}`);
      }

      for (const link of pageResult.links) {
        if (!visited.has(link) && !queue.includes(link)) {
          queue.push(link);
        }
      }
    } catch (err) {
      if (currentUrl === normalizedSeed && pageTexts.length === 0) {
        throw err;
      }
    }
  }

  if (pageTexts.length === 0) {
    throw new Error(
      `No readable text content found across ${visited.size} crawled pages starting from ${seedUrl}`,
    );
  }

  return pageTexts;
}

export async function processWebsiteCrawlJob(
  job: Job<WebsiteCrawlJobData>,
): Promise<WebsiteCrawlResult> {
  const { knowledgeSourceId, organizationId, url, maxPages = 50 } = job.data;

  await prisma.knowledgeSource.update({
    where: { id: knowledgeSourceId, organizationId },
    data: { status: 'PROCESSING' },
  });

  try {
    const pageTexts = await crawlWebsite(url, maxPages);
    const combinedContent = pageTexts.join('\n\n');
    const chunks = chunkText(combinedContent);

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
