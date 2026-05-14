
import { GeminiAdapter } from './gemini';
import type { Adapter } from './interface';

const adapters: Adapter[] = [
  new GeminiAdapter(),
];

export function getCurrentAdapter(): Adapter | null {
  for (const adapter of adapters) {
    if (adapter.detect()) {
      return adapter;
    }
  }
  return null;
}

export function detectPlatform(): string | null {
  const adapter = getCurrentAdapter();
  if (adapter instanceof GeminiAdapter) {
    return 'gemini';
  }
  return null;
}

