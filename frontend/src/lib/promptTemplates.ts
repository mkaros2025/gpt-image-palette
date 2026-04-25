import rawTemplates from '../data/prompt-templates/awesome-gpt-image-2-prompts.json';

type RawPromptTemplate = {
  id?: unknown;
  url?: unknown;
  author?: unknown;
  lang?: unknown;
  text?: unknown;
  likeCount?: unknown;
  viewCount?: unknown;
  createdAt?: unknown;
};

export type PromptTemplate = {
  id: string;
  text: string;
  author: string;
  lang: string;
  sourceUrl: string;
  likeCount: number;
  viewCount: number;
  createdAt: string;
};

export type PromptTemplateFilter = {
  query?: string;
  language?: string;
  limit?: number;
};

export const PROMPT_TEMPLATE_SOURCE = {
  name: 'awesome-gpt-image-2-prompts',
  repositoryUrl: 'https://github.com/EvoLinkAI/awesome-gpt-image-2-prompts',
  license: 'Apache-2.0',
};

export const PROMPT_TEMPLATES: PromptTemplate[] = (rawTemplates as RawPromptTemplate[])
  .map(normalizePromptTemplate)
  .filter((template): template is PromptTemplate => template !== null);

export function filterPromptTemplates(templates: PromptTemplate[], filter: PromptTemplateFilter = {}) {
  const query = filter.query?.trim().toLowerCase() ?? '';
  const language = filter.language ?? 'all';
  const limit = filter.limit ?? 12;

  return templates
    .filter((template) => language === 'all' || template.lang === language)
    .filter((template) => {
      if (!query) {
        return true;
      }
      return `${template.text} ${template.author}`.toLowerCase().includes(query);
    })
    .sort((left, right) => right.likeCount - left.likeCount)
    .slice(0, limit);
}

export function listPromptTemplateLanguages(templates: PromptTemplate[]) {
  return Array.from(new Set(templates.map((template) => template.lang).filter(Boolean))).sort();
}

function normalizePromptTemplate(input: RawPromptTemplate): PromptTemplate | null {
  if (typeof input.id !== 'string' || typeof input.text !== 'string' || !input.text.trim()) {
    return null;
  }

  return {
    id: input.id,
    text: input.text.trim(),
    author: typeof input.author === 'string' && input.author ? input.author : 'unknown',
    lang: typeof input.lang === 'string' && input.lang ? input.lang : 'unknown',
    sourceUrl: typeof input.url === 'string' ? input.url : PROMPT_TEMPLATE_SOURCE.repositoryUrl,
    likeCount: toNumber(input.likeCount),
    viewCount: toNumber(input.viewCount),
    createdAt: typeof input.createdAt === 'string' ? input.createdAt : '',
  };
}

function toNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}
