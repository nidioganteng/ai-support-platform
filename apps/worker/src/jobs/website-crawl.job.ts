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

export async function fetchAndParseWebpage(url: string, timeoutMs = 10000): Promise<string> {
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
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    const textContent = article?.textContent || dom.window.document.body?.textContent || '';
    const cleanText = textContent.replace(/\s+/g, ' ').trim();

    if (!cleanText) {
      throw new Error(`No readable text content found at ${url}`);
    }

    return cleanText;
  } finally {
    clearTimeout(timer);
  }
}

export async function processWebsiteCrawlJob(
  job: Job<WebsiteCrawlJobData>,
): Promise<WebsiteCrawlResult> {
  const { knowledgeSourceId, organizationId, url } = job.data;

  await prisma.knowledgeSource.update({
    where: { id: knowledgeSourceId, organizationId },
    data: { status: 'PROCESSING' },
  });

  try {
    const textContent = await fetchAndParseWebpage(url);
    const chunks = chunkText(textContent);

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
