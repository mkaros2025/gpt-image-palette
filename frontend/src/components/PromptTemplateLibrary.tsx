import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  PROMPT_TEMPLATE_SOURCE,
  filterPromptTemplates,
  listPromptTemplateLanguages,
  type PromptTemplate,
} from '../lib/promptTemplates';

type Props = {
  templates: PromptTemplate[];
  initialOpen?: boolean;
  portal?: boolean;
  onUseTemplate: (prompt: string) => void;
  onAppendTemplate: (prompt: string) => void;
};

export function PromptTemplateLibrary({ templates, initialOpen = false, portal = true, onUseTemplate, onAppendTemplate }: Props) {
  const [open, setOpen] = useState(initialOpen);
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState('all');
  const languages = useMemo(() => listPromptTemplateLanguages(templates), [templates]);
  const visibleTemplates = useMemo(
    () => filterPromptTemplates(templates, { query, language, limit: templates.length }),
    [templates, query, language],
  );

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const useTemplate = (prompt: string) => {
    onUseTemplate(prompt);
    setOpen(false);
  };

  const appendTemplate = (prompt: string) => {
    onAppendTemplate(prompt);
    setOpen(false);
  };

  const popover = open ? (
    <div className="prompt-template-layer" role="presentation" onClick={() => setOpen(false)}>
      <aside className="prompt-template-popover" role="dialog" aria-modal="true" aria-label="模板库" onClick={(event) => event.stopPropagation()}>
        <div className="template-popover-head">
          <div>
            <h2>模板库</h2>
            <p>{PROMPT_TEMPLATE_SOURCE.name} · {visibleTemplates.length} / {templates.length}</p>
          </div>
          <button className="table-icon-action" type="button" aria-label="关闭模板库" onClick={() => setOpen(false)}>关闭</button>
        </div>

        <div className="template-toolbar">
          <label className="field">
            <span>搜索模板</span>
            <input value={query} placeholder="作者或 prompt 关键词" onChange={(event) => setQuery(event.target.value)} />
          </label>
          <label className="field template-language-field">
            <span>语言</span>
            <select value={language} onChange={(event) => setLanguage(event.target.value)}>
              <option value="all">全部</option>
              {languages.map((nextLanguage) => (
                <option key={nextLanguage} value={nextLanguage}>{nextLanguage}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="template-list" aria-label={`模板列表，共 ${visibleTemplates.length} 条`}>
          {visibleTemplates.map((template) => (
            <article className="template-card" key={template.id}>
              <p>{template.text}</p>
              <div className="template-meta">
                <span>{template.lang}</span>
                <span>@{template.author}</span>
                <span>{template.likeCount} likes</span>
              </div>
              <div className="template-actions">
                <button className="quiet-button" type="button" onClick={() => useTemplate(template.text)}>使用模板</button>
                <button className="table-icon-action" type="button" onClick={() => appendTemplate(template.text)}>追加</button>
                <a className="table-icon-action" href={template.sourceUrl} target="_blank" rel="noreferrer">打开来源</a>
              </div>
            </article>
          ))}
        </div>

        <p className="template-source-note">
          Source:
          {' '}
          <a href={PROMPT_TEMPLATE_SOURCE.repositoryUrl} target="_blank" rel="noreferrer">{PROMPT_TEMPLATE_SOURCE.name}</a>
          {' '}
          /
          {' '}
          {PROMPT_TEMPLATE_SOURCE.license}
        </p>
      </aside>
    </div>
  ) : null;

  return (
    <section className="prompt-template-panel">
      <button className="template-trigger" type="button" aria-expanded={open} onClick={() => setOpen(true)}>
        <span>模板库</span>
        <small>{PROMPT_TEMPLATE_SOURCE.name}</small>
      </button>

      {popover && portal && typeof document !== 'undefined' ? createPortal(popover, document.body) : popover}
    </section>
  );
}
