import { useState } from 'react';

import { IMAGE_SIZE_OPTIONS, NO_COLOR_SCHEME_ID } from '../lib/generationOptions';
import { getHistoryErrorMessage } from '../lib/history';
import { getPaletteLabel } from '../lib/format';
import { PROMPT_TEMPLATES } from '../lib/promptTemplates';
import type { ColorScheme, GenerationJob, HistoryItem, Settings, Workspace } from '../lib/types';
import { useDampedHorizontalScroll } from '../lib/horizontalScroll';
import { PaletteSwatches } from './PaletteSwatches';
import { FullscreenImageDialog } from './FullscreenImageDialog';
import { PromptTemplateLibrary } from './PromptTemplateLibrary';
import { ReferenceImageDialog } from './ReferenceImageDialog';
import { ResultDetailDialog } from './ResultDetailDialog';

export type GenerationNotice = {
  kind: 'running' | 'success' | 'failed';
  message: string;
} | null;

type Props = {
  settings: Settings;
  workspace: Workspace;
  palettes: ColorScheme[];
  activeJobs: GenerationJob[];
  history: HistoryItem[];
  generationNotice?: GenerationNotice;
  isGenerating?: boolean;
  onWorkspaceChange: (next: Workspace) => void;
  onUploadReferenceImages: (files: File[]) => Promise<void>;
  onRemoveReferenceImage: (index: number) => Promise<void>;
  onGenerate: () => Promise<void>;
  onOpenSettings: () => void;
  onRefreshHistory: () => Promise<unknown>;
  onDeleteHistoryItem?: (id: string) => Promise<void>;
};

export function GeneratePage(props: Props) {
  const [selectedResult, setSelectedResult] = useState<HistoryItem | null>(null);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [fullscreenImageUrl, setFullscreenImageUrl] = useState<string | null>(null);
  const galleryRef = useDampedHorizontalScroll<HTMLDivElement>();
  const isGenerationInFlight = Boolean(props.isGenerating || props.generationNotice?.kind === 'running');
  const selectedPalette = props.workspace.colorSchemeId === NO_COLOR_SCHEME_ID
    ? null
    : props.palettes.find((palette) => palette.id === props.workspace.colorSchemeId) ?? null;
  const missingSettings = !props.settings.baseUrl || !props.settings.apiKey;
  const currentJob = props.activeJobs[0] ?? null;
  const currentJobCompleted = currentJob ? currentJob.completedCount + currentJob.failedCount : 0;
  const currentJobTotal = currentJob?.count ?? 0;
  const currentJobProgress = currentJob
    ? Math.round((currentJobCompleted / Math.max(1, currentJobTotal)) * 100)
    : props.generationNotice?.kind === 'success' || props.generationNotice?.kind === 'failed'
      ? 100
      : 0;
  const currentJobProgressLabel = currentJob
    ? `${currentJobCompleted} / ${currentJobTotal}`
    : props.generationNotice?.kind === 'success'
      ? '100%'
      : props.generationNotice?.kind === 'failed'
        ? '100%'
        : '—';
  const currentJobStatusLabel = currentJob
    ? props.activeJobs.length > 1
      ? `${props.activeJobs.length} 个任务进行中`
      : currentJob.status === 'pending'
        ? '排队中'
        : '进行中'
    : props.isGenerating
      ? '提交中'
    : props.generationNotice?.kind === 'success'
      ? '已完成'
      : props.generationNotice?.kind === 'failed'
        ? '生成失败'
      : props.generationNotice?.kind === 'running'
          ? '等待中'
          : '暂无任务';
  const latest = isGenerationInFlight ? null : props.history[0] ?? null;
  const latestError = latest ? getHistoryErrorMessage(latest) : null;
  const recent = props.history.slice(0, 12);
  const latestPreviewStyle = latest?.previewUrl
    ? { backgroundImage: `url("${latest.previewUrl.replace(/["\\]/g, '\\$&')}")` }
    : undefined;
  const referenceImages = props.workspace.referenceImages;

  return (
    <div className="generate-page">
      <section className="generation-workbench">
        <form
          className="generation-sidebar"
          onSubmit={(event) => {
            event.preventDefault();
            void props.onGenerate();
          }}
        >
          <div className="composer-head">
            <span className="composer-title">Prompt</span>
            <span className="label">描述你需要的图片</span>
          </div>
          <textarea
            className="prompt-input"
            placeholder="描述你需要的图片..."
            value={props.workspace.prompt}
            onChange={(event) => props.onWorkspaceChange({ ...props.workspace, prompt: event.target.value })}
          />

          <PromptTemplateLibrary
            templates={PROMPT_TEMPLATES}
            onUseTemplate={(prompt) => props.onWorkspaceChange({ ...props.workspace, prompt })}
            onAppendTemplate={(prompt) => props.onWorkspaceChange({
              ...props.workspace,
              prompt: props.workspace.prompt.trim() ? `${props.workspace.prompt.trim()}\n\n${prompt}` : prompt,
            })}
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
                <option value="auto">auto</option>
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
            <div className="palette-preview-row sidebar-divider">
              <span className="label">配色预览</span>
              <PaletteSwatches colors={selectedPalette.colors} />
            </div>
          ) : null}

          <div className="reference-upload sidebar-divider">
            <div className="reference-upload-head">
              <span className="reference-title">参考图</span>
              <span className="label">{referenceImages.length ? `${referenceImages.length} 张` : '可多选上传'}</span>
            </div>
            <div className={referenceImages.length ? 'reference-strip' : undefined}>
              {referenceImages.length ? (
                <div className="reference-grid" aria-label="已上传参考图">
                  {referenceImages.map((image, index) => (
                    <div className="reference-tile" key={`${image.path}-${index}`}>
                      <button className="reference-thumb-button" type="button" onClick={() => setReferenceOpen(true)} aria-label={`查看参考图 ${index + 1}`} title={image.name ?? `参考图 ${index + 1}`}>
                        <img src={image.path} alt="" />
                      </button>
                      <button className="reference-remove-button" type="button" onClick={() => void props.onRemoveReferenceImage(index)} aria-label={`移除参考图 ${index + 1}`}>x</button>
                    </div>
                  ))}
                </div>
              ) : null}
              <label className={referenceImages.length ? 'reference-add-button' : 'reference-card reference-card--empty'}>
                <span className="reference-thumb-placeholder" aria-hidden="true" />
                <span>
                  <span className="reference-title">{referenceImages.length ? '继续添加' : '参考图'}</span>
                  <span className="label">点击或多选图片</span>
                </span>
                <input type="file" accept="image/*" multiple onChange={(event) => {
                  const files = Array.from(event.currentTarget.files ?? []);
                  event.currentTarget.value = '';
                  if (files.length) {
                    void props.onUploadReferenceImages(files);
                  }
                }} />
              </label>
            </div>
          </div>

          <div className="generate-actions">
            <div className="generate-notices">
              {missingSettings ? (
                <p className="inline-hint">缺少 baseURL 或 API Key。<button type="button" className="link-button" onClick={props.onOpenSettings}>去设置</button></p>
              ) : null}
              {props.generationNotice ? (
                <p className={props.generationNotice.kind === 'failed' ? 'inline-hint generation-notice' : 'inline-status generation-notice'}>
                  {props.generationNotice.kind === 'failed' ? '生成失败：' : null}
                  {props.generationNotice.message}
                </p>
              ) : null}
            </div>

            <button className="primary-button" type="submit" disabled={!props.workspace.prompt.trim() || missingSettings || props.isGenerating}>
              {props.isGenerating ? '生成中' : '生成图片'}
            </button>
          </div>
        </form>

        <aside className="generation-preview">
          <div className="task-status">
            <span className="label">当前任务</span>
            <div
              className="task-meter"
              role="progressbar"
              aria-label="当前任务进度"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={currentJobProgress}
              aria-valuetext={`${currentJobProgressLabel} · ${currentJobStatusLabel}`}
            >
              <span className="task-meter-track" aria-hidden="true">
                <span className={props.generationNotice?.kind === 'failed' ? 'task-meter-fill task-meter-fill--failed' : 'task-meter-fill'} style={{ width: `${currentJobProgress}%` }} />
              </span>
              <span className="task-meter-text">{currentJobProgressLabel}</span>
            </div>
            <span className="task-status-value">{currentJobStatusLabel}</span>
          </div>

          <div className="preview-frame">
            {latest?.previewUrl ? (
              <button className="preview-image-button" type="button" aria-label="全屏查看最近生成结果" onClick={() => setFullscreenImageUrl(latest.previewUrl)}>
                <span className="preview-image-surface" role="img" aria-label="最近生成结果" style={latestPreviewStyle} />
              </button>
            ) : isGenerationInFlight ? (
              <div className="preview-empty">
                <span>正在生成</span>
                <p>新结果出现前，这里会先保持空白。</p>
              </div>
            ) : latest?.status === 'failed' ? (
              <div className="preview-empty preview-empty--failed">
                <span>生成失败</span>
                <p>{latestError ?? '请检查网关设置或稍后重试。'}</p>
              </div>
            ) : (
              <div className="preview-empty">
                <span>暂无图片</span>
                <p>生成后会在这里显示最近一次请求的结果。</p>
              </div>
            )}
          </div>

          <div className="preview-meta">
            <div className="preview-meta-item"><span>尺寸</span><span className="preview-meta-value">{latest?.size ?? props.workspace.size}</span></div>
            <div className="preview-meta-item"><span>质量</span><span className="preview-meta-value">{latest?.quality ?? props.workspace.quality}</span></div>
            <div className="preview-meta-item"><span>配色</span><span className="preview-meta-value">{latest ? getPaletteLabel(props.palettes, latest.colorSchemeId) : selectedPalette?.name ?? '无配色'}</span></div>
          </div>
        </aside>
      </section>

      <section className="recent-results" aria-label="最近结果">
        <div className="gallery-header">
          <h2>最近结果</h2>
          <span className="label">点击图片查看 prompt、分辨率、质量、配色、时间</span>
        </div>
        <div className="recent-strip gallery-strip" data-horizontal-wheel="true" ref={galleryRef}>
          {recent.length ? recent.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.status === 'failed' ? 'gallery-thumb gallery-thumb--failed' : 'gallery-thumb'}
              aria-label={`查看 ${item.prompt} 的生成详情`}
              onClick={() => setSelectedResult(item)}
            >
              {item.previewUrl ? <img src={item.previewUrl} alt="" /> : (
                <span>
                  <span className="gallery-thumb-title">{item.status === 'failed' ? '生成失败' : '无预览'}</span>
                  {item.status === 'failed' ? <small>{getHistoryErrorMessage(item) ?? '查看详情'}</small> : null}
                </span>
              )}
            </button>
          )) : (
            <div className="gallery-empty-state">
              <span className="gallery-empty-title">还没有最近结果</span>
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
      <FullscreenImageDialog imageUrl={fullscreenImageUrl} label="全屏查看最近生成结果" onClose={() => setFullscreenImageUrl(null)} />
      {referenceOpen ? <ReferenceImageDialog workspace={props.workspace} onClose={() => setReferenceOpen(false)} /> : null}
    </div>
  );
}
