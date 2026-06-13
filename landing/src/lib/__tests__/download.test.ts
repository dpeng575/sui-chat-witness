import { describe, expect, test } from 'vitest';
import { safeMarkdownFilename } from '../download';

describe('safeMarkdownFilename', () => {
  test('replaces unsafe characters with hyphens and appends markdown extension', () => {
    expect(safeMarkdownFilename('a/b:c*?"<>|')).toBe('a-b-c------.md');
  });

  test('uses conversation.md for blank input', () => {
    expect(safeMarkdownFilename('   ')).toBe('conversation.md');
  });

  test('does not duplicate an existing markdown extension', () => {
    expect(safeMarkdownFilename('notes.md')).toBe('notes.md');
  });
});
