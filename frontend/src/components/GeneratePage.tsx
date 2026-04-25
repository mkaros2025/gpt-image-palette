import { useState } from 'react';

import { IMAGE_SIZE_OPTIONS, NO_COLOR_SCHEME_ID } from '../lib/generationOptions';
import { getPaletteLabel } from '../lib/format';
import type { ColorScheme, GenerationJob, HistoryItem, Settings, Workspace } from '../lib/types';
import { useDampedHorizontalScroll } from '../lib/horizontalScroll';
import { PaletteSwatches } from './PaletteSwatches';
import { ReferenceImageDialog } from './ReferenceImageDialog';
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
  const [referenceOpen, setReferenceOpen] = useState(false);
  const galleryRef = useDampedHorizontalScroll<HTMLDivElement>();
  const selectedPalette = props.workspace.colorSchemeId === NO_COLOR_SCHEME_ID
    ? null
    : props.palettes.find((palette) => palette.id === props.workspace.colorSchemeId) ?? null;
  const missingSettings = !props.settings.baseUrl || !props.settings.apiKey;
  const latest = props.history[0] ?? null;
  const recent = props.history.slice(0, 12);

  return (
    <div className="generate-page">
      <section className="generate-layout">
        <form
          className="panel panel--input gallery-panel"
          onSubmit={(event) => {
            event.preventDefault();
            void props.onGenerate();
          }}
        >
          <div className="label-row">
            <span className="label label--strong">Prompt</span>
            <span className="label">描述你需要的图片</span>
          </div>
          <textarea
            className="prompt-input"
            placeholder="描述你需要的图片..."
            value={props.workspace.prompt}
            onChange={(event) => props.onWorkspaceChange({ ...props.workspace, prompt: event.target.value })}
          />

          <div className="control-grid">
            <label className="field">
              <span>尺寸</span>
              <select value={props.workspace.size} onChange={(event) => props.onWorkspaceChange({ ...props.workspace, size: event.target.value })}>
                {IMAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
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
                <option value={NO_COLOR_SCHEME_ID}>无配色</option>
                {props.palettes.map((palette) => (
                  <option key={palette.id} value={palette.id}>{palette.name}</option>
                ))}
              </select>
            </label>
          </div>

          {selectedPalette ? (
            <div className="palette-preview-row generate-compact-surface">
              <span className="label">配色预览</span>
              <PaletteSwatches colors={selectedPalette.colors} />
            </div>
          ) : null}

          <div className="reference-upload">
            {props.workspace.referenceImagePath ? (
              <div className="reference-preview">
                <button className="reference-card generate-compact-surface" type="button" onClick={() => setReferenceOpen(true)}>
                  <img src={props.workspace.referenceImagePath} alt="" />
                  <span>
                    <strong>参考图</strong>
                    <span className="label">{props.workspace.referenceImageName ?? '已上传'}</span>
                  </span>
                </button>
                <button className="quiet-button" type="button" onClick={() => void props.onRemoveReferenceImage()}>移除</button>
              </div>
            ) : (
              <label className="reference-card reference-card--empty generate-compact-surface">
                <span className="reference-thumb-placeholder" aria-hidden="true" />
                <span>
                  <strong>参考图</strong>
                  <span className="label">点击选择图片</span>
                </span>
                <input type="file" accept="image/*" onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (file) {
                    void props.onUploadReferenceImage(file);
                  }
                }} />
              </label>
            )}
          </div>

          <div className="generate-actions">
            {missingSettings ? (
              <p className="inline-hint">缺少 baseURL 或 API Key。<button type="button" className="link-button" onClick={props.onOpenSettings}>去设置</button></p>
            ) : null}

            <button className="primary-button" type="submit" disabled={!props.workspace.prompt.trim() || missingSettings}>生成图片</button>
          </div>
        </form>

        <aside className="panel panel--preview gallery-panel">
          <div className="status-row">
            <span className="label">当前任务</span>
            <strong>{props.activeJobs.length ? `${props.activeJobs.length} 个任务进行中` : '暂无任务'}</strong>
          </div>
          <div className="latest-frame">
            {latest?.previewUrl ? (
              <img className="latest-image" src={latest.previewUrl} alt="" />
            ) : (
              <div className="latest-empty-state">
                <span>暂无图片</span>
                <p>生成后会在这里显示最近一次请求的结果。</p>
              </div>
            )}
          </div>
          <div className="latest-meta">
            <div><span>尺寸</span><strong>{latest?.size ?? props.workspace.size}</strong></div>
            <div><span>质量</span><strong>{latest?.quality ?? props.workspace.quality}</strong></div>
            <div><span>配色</span><strong>{latest ? getPaletteLabel(props.palettes, latest.colorSchemeId) : selectedPalette?.name ?? '无配色'}</strong></div>
          </div>
        </aside>
      </section>

      <section className="recent-gallery" aria-label="最近结果">
        <div className="gallery-header">
          <h2>最近结果</h2>
          <span className="label">点击图片查看 prompt、分辨率、质量、配色、时间</span>
        </div>
        <div className="gallery-strip" data-horizontal-wheel="true" ref={galleryRef}>
          {recent.length ? recent.map((item) => (
            <button
              key={item.id}
              type="button"
              className="gallery-thumb"
              aria-label={`查看 ${item.prompt} 的生成详情`}
              onClick={() => setSelectedResult(item)}
            >
              {item.previewUrl ? <img src={item.previewUrl} alt="" /> : <span>无预览</span>}
            </button>
          )) : (
            <div className="gallery-empty-state">
              <strong>还没有最近结果</strong>
              <span>生成图片后，最近 12 张会从左到右出现在这里。</span>
            </div>
          )}
        </div>
      </section>

      <ResultDetailDialog
        item={selectedResult}
        paletteName={selectedResult ? getPaletteLabel(props.palettes, selectedResult.colorSchemeId) : undefined}
        onClose={() => setSelectedResult(null)}
        onDelete={async (id) => {
          if (props.onDeleteHistoryItem) {
            await props.onDeleteHistoryItem(id);
          }
          setSelectedResult(null);
          await props.onRefreshHistory();
        }}
      />
      {referenceOpen ? <ReferenceImageDialog workspace={props.workspace} onClose={() => setReferenceOpen(false)} /> : null}
    </div>
  );
}
