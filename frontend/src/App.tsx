import { useEffect, useState } from 'react';

import { apiGet } from './lib/api';
import { NAV_ITEMS, normalizePageId, type PageId } from './lib/navigation';
import type { ColorScheme, GenerationJob, HistoryItem, Settings, Workspace } from './lib/types';
import { DEFAULT_WORKSPACE, normalizeWorkspace } from './lib/workspacePayload';
import './styles.css';

export function App() {
  const [page, setPage] = useState<PageId>(() => {
    if (typeof window === 'undefined') {
      return 'generate';
    }
    return normalizePageId(window.location.hash.replace('#/', ''));
  });
  const [settings, setSettings] = useState<Settings>({ baseUrl: '', apiKey: '', updatedAt: '' });
  const [workspace, setWorkspace] = useState<Workspace>(DEFAULT_WORKSPACE);
  const [palettes, setPalettes] = useState<ColorScheme[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeJobs, setActiveJobs] = useState<GenerationJob[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiGet<Settings>('/settings'),
      apiGet<Workspace>('/workspace'),
      apiGet<ColorScheme[]>('/color-schemes'),
      apiGet<HistoryItem[]>('/history'),
      apiGet<GenerationJob[]>('/generations/active'),
    ])
      .then(([nextSettings, nextWorkspace, nextPalettes, nextHistory, nextActiveJobs]) => {
        if (!active) {
          return;
        }
        setSettings(nextSettings);
        setWorkspace(normalizeWorkspace(nextWorkspace));
        setPalettes(nextPalettes);
        setHistory(nextHistory);
        setActiveJobs(nextActiveJobs);
        setLoadError(null);
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setLoadError(error instanceof Error ? error.message : String(error));
      });

    return () => {
      active = false;
    };
  }, []);

  const selectPage = (next: PageId) => {
    if (typeof window !== 'undefined') {
      window.location.hash = `/${next}`;
    }
    setPage(next);
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand-button" type="button" onClick={() => selectPage('generate')}>
          PaperPalette
        </button>
        <nav className="topnav" aria-label="主导航">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={item.id === page ? 'nav-link nav-link--active' : 'nav-link'}
              type="button"
              onClick={() => selectPage(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>
      <section className="page-frame">
        {loadError ? <p className="inline-hint">后端暂时不可用：{loadError}</p> : null}
        <p className="empty-state">
          页面待实现：{settings.baseUrl || workspace.prompt || palettes.length || history.length || activeJobs.length ? '已载入数据' : '等待数据'}
        </p>
      </section>
    </main>
  );
}
