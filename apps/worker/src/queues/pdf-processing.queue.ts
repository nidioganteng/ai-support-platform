import { Queue } from 'bullmq';
import { getRedisConnectionOptions } from '../connection.js';

export const PDF_PROCESSING_QUEUE_NAME = 'pdf-processing';

export interface PdfProcessingJobData {
  knowledgeSourceId: string;
  organizationId: string;
  filePath: string;
  originalFileName: string;
}

export function createPdfProcessingQueue(): Queue<PdfProcessingJobData> {
  return new Queue<PdfProcessingJobData>(PDF_PROCESSING_QUEUE_NAME, {
    connection: getRedisConnectionOptions(),
  });
}
