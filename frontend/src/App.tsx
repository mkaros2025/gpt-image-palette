import { useEffect, useState } from 'react';

import { GeneratePage } from './components/GeneratePage';
import { apiDelete, apiGet, apiPost, apiPut } from './lib/api';
import { NAV_ITEMS, normalizePageId, type PageId } from './lib/navigation';
import type { ColorScheme, GenerationJob, HistoryItem, Settings, Workspace } from './lib/types';
import { buildGenerationPayload, buildWorkspacePayload, DEFAULT_WORKSPACE, normalizeWorkspace } from './lib/workspacePayload';
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

  const refreshHistory = async () => {
    setHistory(await apiGet<HistoryItem[]>('/history'));
  };

  const refreshActiveJobs = async () => {
    setActiveJobs(await apiGet<GenerationJob[]>('/generations/active'));
  };

  const saveWorkspace = async () => {
    const saved = await apiPut<Workspace>('/workspace', buildWorkspacePayload(workspace));
    setWorkspace(normalizeWorkspace(saved));
  };

  const uploadReferenceImage = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const saved = await apiPost<Workspace>('/workspace/reference-image', formData);
    setWorkspace(normalizeWorkspace(saved));
  };

  const removeReferenceImage = async () => {
    const saved = await apiDelete<Workspace>('/workspace/reference-image');
    setWorkspace(normalizeWorkspace(saved));
  };

  const generate = async () => {
    await saveWorkspace();
    await apiPost('/generations', buildGenerationPayload(workspace));
    await refreshActiveJobs();
    await refreshHistory();
  };

  const deleteHistoryItem = async (id: string) => {
    await apiDelete<{ ok: boolean }>(`/history/${id}`);
    await refreshHistory();
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
        {page === 'generate' ? (
          <GeneratePage
            settings={settings}
            workspace={workspace}
            palettes={palettes}
            activeJobs={activeJobs}
            history={history}
            onWorkspaceChange={setWorkspace}
            onSaveWorkspace={saveWorkspace}
            onUploadReferenceImage={uploadReferenceImage}
            onRemoveReferenceImage={removeReferenceImage}
            onGenerate={generate}
            onOpenSettings={() => selectPage('settings')}
            onRefreshHistory={refreshHistory}
            onDeleteHistoryItem={deleteHistoryItem}
          />
        ) : (
          <p className="empty-state">页面待实现</p>
        )}
      </section>
    </main>
  );
}
