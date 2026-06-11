import { describe, expect, test } from 'vitest';
import { safeMarkdownFilename } from '../download';

describe('safeMarkdownFilename', () => {
  test('replaces unsafe characters with hyphens', () => {
    expect(safeMarkdownFilename('a/b:c*?"<>|')).toBe('a-b-c------');
  });

  test('uses conversation.md for blank input', () => {
    expect(safeMarkdownFilename('')).toBe('conversation');
  });

  test('leaves safe filenames unchanged', () => {
    expect(safeMarkdownFilename('notes.md')).toBe('notes.md');
  });
});
