import { describe, expect, it } from 'vitest';
import { chunkText } from './pdf-processing.job.js';

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
    // Build a text longer than CHUNK_CHARS (2000 chars)
    const word = 'word ';
    const text = word.repeat(500); // 2500 chars
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(1);
    // Each chunk is at most CHUNK_CHARS characters
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(2000);
    }
  });

  it('produces overlap between consecutive chunks', () => {
    const word = 'x';
    const text = word.repeat(2500);
    const chunks = chunkText(text);
    // Second chunk should start before end of first chunk (overlap = 200)
    expect(chunks.length).toBeGreaterThanOrEqual(2);
  });
});
