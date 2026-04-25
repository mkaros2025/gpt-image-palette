import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { PromptTemplateLibrary } from '../src/components/PromptTemplateLibrary';
import { PROMPT_TEMPLATES } from '../src/lib/promptTemplates';

const templates = [
  {
    id: 'template-a',
    text: 'A precise cinematic product render on a neutral workbench.',
    author: 'maker-a',
    lang: 'en',
    sourceUrl: 'https://example.com/a',
    likeCount: 12,
    viewCount: 300,
    createdAt: '2026-04-20T00:00:00.000Z',
  },
  {
    id: 'template-b',
    text: '生成一张冷白背景下的产品照片。',
    author: 'maker-b',
    lang: 'zh',
    sourceUrl: 'https://example.com/b',
    likeCount: 20,
    viewCount: 500,
    createdAt: '2026-04-21T00:00:00.000Z',
  },
];

const manyTemplates = Array.from({ length: 10 }, (_, index) => ({
  id: `template-${index}`,
  text: `template ${index}`,
  author: `maker-${index}`,
  lang: 'en',
  sourceUrl: `https://example.com/${index}`,
  likeCount: 100 - index,
  viewCount: 1000 - index,
  createdAt: '2026-04-21T00:00:00.000Z',
}));

describe('PromptTemplateLibrary', () => {
  it('renders a non-layout-shifting trigger by default', () => {
    const html = renderToStaticMarkup(
      <PromptTemplateLibrary
        templates={templates}
        onUseTemplate={() => {}}
        onAppendTemplate={() => {}}
      />,
    );

    expect(html).toContain('模板库');
    expect(html).toContain('class="template-trigger"');
    expect(html).not.toContain('搜索模板');
    expect(html).not.toContain('class="prompt-template-popover"');
    expect(html).not.toContain('<details');
  });

  it('renders the attributed template picker in a fixed popover when opened', () => {
    const html = renderToStaticMarkup(
      <PromptTemplateLibrary
        templates={templates}
        initialOpen
        portal={false}
        onUseTemplate={() => {}}
        onAppendTemplate={() => {}}
      />,
    );

    expect(html).toContain('class="prompt-template-popover"');
    expect(html).toContain('搜索模板');
    expect(html).toContain('语言');
    expect(html).toContain('使用模板');
    expect(html).toContain('追加');
    expect(html).toContain('打开来源');
    expect(html).toContain('Apache-2.0');
    expect(html).toContain('awesome-gpt-image-2-prompts');
    expect(html).not.toContain('pbs.twimg.com');
  });

  it('shows all available templates so the list can keep scrolling downward', () => {
    const html = renderToStaticMarkup(
      <PromptTemplateLibrary
        templates={manyTemplates}
        initialOpen
        portal={false}
        onUseTemplate={() => {}}
        onAppendTemplate={() => {}}
      />,
    );

    expect((html.match(/class="template-card"/g) ?? []).length).toBe(10);
    expect(html).toContain('template 0');
    expect(html).toContain('template 9');
  });

  it('renders every imported prompt template in the open library', () => {
    const html = renderToStaticMarkup(
      <PromptTemplateLibrary
        templates={PROMPT_TEMPLATES}
        initialOpen
        portal={false}
        onUseTemplate={() => {}}
        onAppendTemplate={() => {}}
      />,
    );

    expect((html.match(/class="template-card"/g) ?? []).length).toBe(PROMPT_TEMPLATES.length);
    expect(html).toContain(`${PROMPT_TEMPLATES.length} / ${PROMPT_TEMPLATES.length}`);
  });
});
