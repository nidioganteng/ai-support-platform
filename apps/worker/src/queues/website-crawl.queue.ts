import { Queue } from 'bullmq';
import { getRedisConnectionOptions } from '../connection.js';

export const WEBSITE_CRAWL_QUEUE_NAME = 'website-crawl';

export interface WebsiteCrawlJobData {
  knowledgeSourceId: string;
  organizationId: string;
  url: string;
}

export function createWebsiteCrawlQueue(): Queue<WebsiteCrawlJobData> {
  return new Queue<WebsiteCrawlJobData>(WEBSITE_CRAWL_QUEUE_NAME, {
    connection: getRedisConnectionOptions(),
  });
}
