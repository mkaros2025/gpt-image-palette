import { describe, expect, it } from 'vitest';

import {
  PROMPT_TEMPLATE_SOURCE,
  PROMPT_TEMPLATES,
  filterPromptTemplates,
  listPromptTemplateLanguages,
} from '../src/lib/promptTemplates';

describe('prompt template library', () => {
  it('normalizes the bundled awesome-gpt-image-2-prompts data with attribution metadata', () => {
    expect(PROMPT_TEMPLATES.length).toBeGreaterThan(20);
    expect(PROMPT_TEMPLATE_SOURCE.repositoryUrl).toBe('https://github.com/EvoLinkAI/awesome-gpt-image-2-prompts');
    expect(PROMPT_TEMPLATE_SOURCE.license).toBe('Apache-2.0');

    const first = PROMPT_TEMPLATES[0];
    expect(first.id).toBeTruthy();
    expect(first.text).toBeTruthy();
    expect(first.sourceUrl).toMatch(/^https?:\/\//);
    expect(first.author).toBeTruthy();
    expect(first.lang).toBeTruthy();
    expect(typeof first.likeCount).toBe('number');
  });

  it('filters templates by language and search text without media hotlinks', () => {
    const languages = listPromptTemplateLanguages(PROMPT_TEMPLATES);
    expect(languages).toContain('zh');

    const chinese = filterPromptTemplates(PROMPT_TEMPLATES, { language: 'zh', limit: 5 });
    expect(chinese.length).toBeGreaterThan(0);
    expect(chinese.every((template) => template.lang === 'zh')).toBe(true);

    const searched = filterPromptTemplates(PROMPT_TEMPLATES, { query: chinese[0].author, limit: 10 });
    expect(searched.some((template) => template.author === chinese[0].author)).toBe(true);
    expect(searched.every((template) => !('media' in template))).toBe(true);
  });

  it('returns popular templates first by default', () => {
    const result = filterPromptTemplates(PROMPT_TEMPLATES, { limit: 6 });
    const likes = result.map((template) => template.likeCount);
    expect(likes).toEqual([...likes].sort((left, right) => right - left));
  });
});
