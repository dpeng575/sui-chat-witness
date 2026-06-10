import { describe, expect, it } from 'vitest';

import {
  defaultLocale,
  getDictionary,
  isLocale,
  switchLocalePath,
} from '../i18n';

describe('i18n locale helpers', () => {
  it('accepts zh and en locales and rejects fr', () => {
    expect(isLocale('zh')).toBe(true);
    expect(isLocale('en')).toBe(true);
    expect(isLocale('fr')).toBe(false);
  });

  it('uses zh as the default locale', () => {
    expect(defaultLocale).toBe('zh');
  });

  it('returns localized landing hero titles', () => {
    expect(getDictionary('zh').landing.heroTitle).toContain('AI 对话');
    expect(getDictionary('en').landing.heroTitle).toContain('AI conversations');
  });

  it('has value items with descriptions and 4 workflow items', () => {
    expect(getDictionary('zh').landing.valueItems[0].description).toBeDefined();
    expect(getDictionary('zh').landing.workflowItems).toHaveLength(4);
    expect(getDictionary('en').landing.valueItems[0].description).toBeDefined();
    expect(getDictionary('en').landing.workflowItems).toHaveLength(4);
  });

  it('switches the locale segment in a pathname', () => {
    expect(switchLocalePath('/zh/dashboard', 'en')).toBe('/en/dashboard');
    expect(switchLocalePath('/en', 'zh')).toBe('/zh');
    expect(switchLocalePath('/', 'en')).toBe('/en');
    expect(switchLocalePath('/', 'zh')).toBe('/zh');
    expect(switchLocalePath('/dashboard', 'en')).toBe('/en/dashboard');
  });
});
