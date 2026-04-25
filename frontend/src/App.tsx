import { useEffect, useState } from 'react';

import { BrandLogo } from './components/BrandLogo';
import { GeneratePage, type GenerationNotice } from './components/GeneratePage';
import { HistoryPage } from './components/HistoryPage';
import { PalettesPage } from './components/PalettesPage';
import { SettingsPage } from './components/SettingsPage';
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from './lib/api';
import { getHistoryErrorMessage } from './lib/history';
import { NAV_ITEMS, normalizePageId, type PageId } from './lib/navigation';
import type { ColorScheme, GenerationJob, HistoryItem, PaletteColors, Settings, Workspace } from './lib/types';
import { buildGenerationPayload, buildWorkspacePayload, DEFAULT_WORKSPACE, mergeReferenceImageFields, normalizeWorkspace } from './lib/workspacePayload';
import './styles.css';

const GENERATION_POLL_TIMEOUT_MS = 600_000;
const GENERATION_POLL_INTERVAL_MS = 2_000;
const GENERATION_INITIAL_POLL_DELAY_MS = 1_000;

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
  const [generationNotice, setGenerationNotice] = useState<GenerationNotice>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPaletteId, setSelectedPaletteId] = useState('preset-okabe-ito');
  const [historyQuery, setHistoryQuery] = useState('');

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
    const nextHistory = await apiGet<HistoryItem[]>('/history');
    setHistory(nextHistory);
    return nextHistory;
  };

  const refreshActiveJobs = async () => {
    const nextActiveJobs = await apiGet<GenerationJob[]>('/generations/active');
    setActiveJobs(nextActiveJobs);
    return nextActiveJobs;
  };

  const saveWorkspace = async () => {
    const saved = await apiPut<Workspace>('/workspace', buildWorkspacePayload(workspace));
    setWorkspace(normalizeWorkspace(saved));
  };

  const uploadReferenceImages = async (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    const saved = await apiPost<Workspace>('/workspace/reference-images', formData);
    setWorkspace((current) => mergeReferenceImageFields(current, normalizeWorkspace(saved)));
  };

  const removeReferenceImage = async (index: number) => {
    const saved = await apiDelete<Workspace>(`/workspace/reference-images/${index}`);
    setWorkspace((current) => mergeReferenceImageFields(current, normalizeWorkspace(saved)));
  };

  const generate = async () => {
    if (isGenerating) {
      return;
    }

    setIsGenerating(true);
    setGenerationNotice({ kind: 'running', message: '正在提交生成任务...' });

    try {
      await saveWorkspace();
      const job = await apiPost<{ id: string; requestedCount: number; status: string }>('/generations', buildGenerationPayload(workspace));
      setGenerationNotice({ kind: 'running', message: '任务已提交，正在生成...' });
      await refreshActiveJobs();
      await refreshHistory();
      await pollGeneration(job.id, job.requestedCount);
    } catch (error) {
      setGenerationNotice({
        kind: 'failed',
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const pollGeneration = async (jobId: string, requestedCount: number) => {
    const deadline = Date.now() + GENERATION_POLL_TIMEOUT_MS;
    let firstPoll = true;

    while (Date.now() < deadline) {
      await delay(firstPoll ? GENERATION_INITIAL_POLL_DELAY_MS : GENERATION_POLL_INTERVAL_MS);
      firstPoll = false;
      const [nextActiveJobs, nextHistory] = await Promise.all([
        refreshActiveJobs(),
        refreshHistory(),
      ]);
      const jobStillActive = nextActiveJobs.some((job) => job.id === jobId);
      const jobItems = nextHistory.filter((item) => item.jobId === jobId);
      const failedItem = jobItems.find((item) => item.status === 'failed');

      if (failedItem) {
        setGenerationNotice({
          kind: 'failed',
          message: getHistoryErrorMessage(failedItem) ?? '生成失败，但网关没有返回错误详情。',
        });
        return;
      }

      if (!jobStillActive && jobItems.length >= requestedCount) {
        setGenerationNotice({ kind: 'success', message: '生成完成。' });
        return;
      }

      if (!jobStillActive && jobItems.length === 0) {
        setGenerationNotice({ kind: 'failed', message: '任务已结束，但没有返回图片。请检查网关响应或设置。' });
        return;
      }
    }

    setGenerationNotice({ kind: 'running', message: '任务仍在生成，已等待 600 秒，可稍后刷新历史查看结果。' });
  };

  const deleteHistoryItem = async (id: string) => {
    await apiDelete<{ ok: boolean }>(`/history/${id}`);
    await refreshHistory();
  };

  const searchHistory = async () => {
    const suffix = historyQuery.trim() ? `?query=${encodeURIComponent(historyQuery.trim())}` : '';
    setHistory(await apiGet<HistoryItem[]>(`/history${suffix}`));
  };

  const reuseHistoryItem = (patch: Partial<Workspace>) => {
    setWorkspace(normalizeWorkspace({ ...workspace, ...patch }));
    selectPage('generate');
  };

  const confirmAndDeleteHistoryItem = async (id: string) => {
    if (window.confirm('删除这张图片？')) {
      await deleteHistoryItem(id);
    }
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
          <BrandLogo />
        </button>
        <nav className="topnav topnav--glass" aria-label="主导航">
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
            generationNotice={generationNotice}
            isGenerating={isGenerating}
            onWorkspaceChange={setWorkspace}
            onUploadReferenceImages={uploadReferenceImages}
            onRemoveReferenceImage={removeReferenceImage}
            onGenerate={generate}
            onOpenSettings={() => selectPage('settings')}
            onRefreshHistory={refreshHistory}
            onDeleteHistoryItem={deleteHistoryItem}
          />
        ) : page === 'history' ? (
          <HistoryPage
            items={history}
            palettes={palettes}
            query={historyQuery}
            onQueryChange={setHistoryQuery}
            onSearch={searchHistory}
            onReuse={reuseHistoryItem}
            onDelete={confirmAndDeleteHistoryItem}
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

function delay(ms: number) {
  return new Promise((resolveDelay) => {
    globalThis.setTimeout(resolveDelay, ms);
  });
}
