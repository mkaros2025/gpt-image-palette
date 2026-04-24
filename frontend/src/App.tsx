import { useEffect, useState } from 'react';

import { GeneratePage } from './components/GeneratePage';
import { PalettesPage } from './components/PalettesPage';
import { SettingsPage } from './components/SettingsPage';
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from './lib/api';
import { NAV_ITEMS, normalizePageId, type PageId } from './lib/navigation';
import type { ColorScheme, GenerationJob, HistoryItem, PaletteColors, Settings, Workspace } from './lib/types';
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
  const [settingsStatus, setSettingsStatus] = useState<string | null>(null);
  const [selectedPaletteId, setSelectedPaletteId] = useState('preset-okabe-ito');

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
        setSelectedPaletteId(nextPalettes.find((palette) => palette.isDefault)?.id ?? nextWorkspace.colorSchemeId);
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

  const saveSettings = async () => {
    const saved = await apiPut<Settings>('/settings', {
      baseUrl: settings.baseUrl,
      apiKey: settings.apiKey,
    });
    setSettings(saved);
    setSettingsStatus('已保存');
  };

  const testConnection = async () => {
    const result = await apiPost<{ ok: boolean; message?: string }>('/settings/test-connection');
    setSettingsStatus(result.ok ? '连接成功' : result.message ?? '连接失败');
  };

  const refreshPalettes = async () => {
    const nextPalettes = await apiGet<ColorScheme[]>('/color-schemes');
    setPalettes(nextPalettes);
    setSelectedPaletteId((current) => nextPalettes.some((palette) => palette.id === current)
      ? current
      : nextPalettes.find((palette) => palette.isDefault)?.id ?? nextPalettes[0]?.id ?? 'preset-okabe-ito');
  };

  const createPalette = async (name: string, colors: PaletteColors) => {
    const created = await apiPost<ColorScheme>('/color-schemes', { name, colors });
    await refreshPalettes();
    setSelectedPaletteId(created.id);
  };

  const copyPalette = async (id: string, name: string) => {
    const copied = await apiPost<ColorScheme>(`/color-schemes/${id}/copy`, { name });
    await refreshPalettes();
    setSelectedPaletteId(copied.id);
  };

  const savePalette = async (id: string, name: string, colors: PaletteColors) => {
    await apiPatch<ColorScheme>(`/color-schemes/${id}`, { name, colors });
    await refreshPalettes();
  };

  const deletePalette = async (id: string) => {
    if (window.confirm('删除这个配色？')) {
      await apiDelete<{ ok: boolean }>(`/color-schemes/${id}`);
      await refreshPalettes();
    }
  };

  const setDefaultPalette = async (id: string) => {
    await apiPut<ColorScheme>(`/color-schemes/${id}/default`);
    await refreshPalettes();
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
        ) : page === 'palettes' ? (
          <PalettesPage
            palettes={palettes}
            selectedId={selectedPaletteId}
            onSelect={setSelectedPaletteId}
            onCreate={createPalette}
            onCopy={copyPalette}
            onSave={savePalette}
            onDelete={deletePalette}
            onSetDefault={setDefaultPalette}
          />
        ) : page === 'settings' ? (
          <SettingsPage
            settings={settings}
            status={settingsStatus}
            onSettingsChange={setSettings}
            onSave={saveSettings}
            onTestConnection={testConnection}
          />
        ) : (
          <p className="empty-state">页面待实现</p>
        )}
      </section>
    </main>
  );
}
