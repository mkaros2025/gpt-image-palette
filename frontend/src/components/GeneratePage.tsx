import { useState } from 'react';

import type { ColorScheme, GenerationJob, HistoryItem, Settings, Workspace } from '../lib/types';
import { ResultDetailDialog } from './ResultDetailDialog';

type Props = {
  settings: Settings;
  workspace: Workspace;
  palettes: ColorScheme[];
  activeJobs: GenerationJob[];
  history: HistoryItem[];
  onWorkspaceChange: (next: Workspace) => void;
  onSaveWorkspace: () => Promise<void>;
  onUploadReferenceImage: (file: File) => Promise<void>;
  onRemoveReferenceImage: () => Promise<void>;
  onGenerate: () => Promise<void>;
  onOpenSettings: () => void;
  onRefreshHistory: () => Promise<void>;
  onDeleteHistoryItem?: (id: string) => Promise<void>;
};

export function GeneratePage(props: Props) {
  const [selectedResult, setSelectedResult] = useState<HistoryItem | null>(null);
  const missingSettings = !props.settings.baseUrl || !props.settings.apiKey;
  const latest = props.history[0] ?? null;
  const recent = props.history.slice(0, 12);

  return (
    <div className="generate-page">
      <section className="generate-grid">
        <form
          className="panel panel--input"
          onSubmit={(event) => {
            event.preventDefault();
            void props.onGenerate();
          }}
        >
          <label className="field field--stacked">
            <span>Prompt</span>
            <textarea
              className="prompt-input"
              value={props.workspace.prompt}
              onChange={(event) => props.onWorkspaceChange({ ...props.workspace, prompt: event.target.value })}
            />
          </label>

          <div className="form-grid">
            <label className="field">
              <span>尺寸</span>
              <select value={props.workspace.size} onChange={(event) => props.onWorkspaceChange({ ...props.workspace, size: event.target.value })}>
                <option value="1024x1024">1024x1024</option>
                <option value="1536x1024">1536x1024</option>
                <option value="1024x1536">1024x1536</option>
              </select>
            </label>
            <label className="field">
              <span>质量</span>
              <select value={props.workspace.quality} onChange={(event) => props.onWorkspaceChange({ ...props.workspace, quality: event.target.value })}>
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
              </select>
            </label>
            <label className="field">
              <span>数量</span>
              <input type="number" min={1} max={4} value={props.workspace.count} onChange={(event) => props.onWorkspaceChange({ ...props.workspace, count: Number(event.target.value) })} />
            </label>
            <label className="field">
              <span>配色</span>
              <select value={props.workspace.colorSchemeId} onChange={(event) => props.onWorkspaceChange({ ...props.workspace, colorSchemeId: event.target.value, customColors: null })}>
                {props.palettes.map((palette) => (
                  <option key={palette.id} value={palette.id}>{palette.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="reference-box">
            <span>参考图</span>
            {props.workspace.referenceImagePath ? (
              <div className="reference-preview">
                <img src={props.workspace.referenceImagePath} alt="" />
                <button className="quiet-button" type="button" onClick={() => void props.onRemoveReferenceImage()}>移除</button>
              </div>
            ) : (
              <input type="file" accept="image/*" onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (file) {
                  void props.onUploadReferenceImage(file);
                }
              }} />
            )}
          </div>

          {missingSettings ? (
            <p className="inline-hint">缺少 baseURL 或 API Key。<button type="button" className="link-button" onClick={props.onOpenSettings}>去设置</button></p>
          ) : null}

          <button className="primary-button" type="submit" disabled={!props.workspace.prompt.trim() || missingSettings}>生成</button>
        </form>

        <aside className="panel panel--status">
          <h1>当前任务</h1>
          <p className="status-line">{props.activeJobs.length ? `${props.activeJobs.length} 个任务进行中` : '暂无任务'}</p>
          <h2>最近一次生成</h2>
          {latest?.previewUrl ? <img className="latest-image" src={latest.previewUrl} alt="" /> : <p className="empty-state">暂无结果</p>}
        </aside>
      </section>

      <section className="recent-gallery" aria-label="最近结果">
        <div className="section-heading">
          <h2>最近结果</h2>
        </div>
        <div className="gallery-strip">
          {recent.length ? recent.map((item) => (
            <button key={item.id} type="button" className="gallery-item" onClick={() => setSelectedResult(item)}>
              {item.previewUrl ? <img src={item.previewUrl} alt="" /> : <span>无预览</span>}
            </button>
          )) : <p className="empty-state">暂无结果</p>}
        </div>
      </section>

      <ResultDetailDialog
        item={selectedResult}
        onClose={() => setSelectedResult(null)}
        onDelete={async (id) => {
          if (props.onDeleteHistoryItem) {
            await props.onDeleteHistoryItem(id);
          }
          setSelectedResult(null);
          await props.onRefreshHistory();
        }}
      />
    </div>
  );
}
