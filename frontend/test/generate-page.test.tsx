import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { GeneratePage } from '../src/components/GeneratePage';
import { DEFAULT_WORKSPACE } from '../src/lib/workspacePayload';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const palette = {
  id: 'preset-okabe-ito',
  name: 'Okabe-Ito',
  description: '',
  isDefault: true,
  isPreset: true,
  createdAt: null,
  updatedAt: null,
  colors: {
    primary: '#0072B2',
    secondary: '#E69F00',
    tertiary: '#009E73',
    text: '#333333',
    fill: '#FFFFFF',
    section_bg: '#F7F7F7',
    border: '#CCCCCC',
    arrow: '#4D4D4D',
  },
};

const historyItems = Array.from({ length: 13 }, (_, index) => ({
  id: `image-${index}`,
  jobId: `job-${index}`,
  prompt: `prompt ${index}`,
  size: '1536x1024',
  quality: 'high',
  colorSchemeId: 'preset-okabe-ito',
  customColors: null,
  referenceImages: [],
  imagePath: `generated/${index}.png`,
  status: 'completed',
  width: 1536,
  height: 1024,
  fileSize: 1024,
  errorMessage: null,
  position: index,
  createdAt: '2026-04-25T00:00:00Z',
  updatedAt: '2026-04-25T00:00:00Z',
  previewUrl: `/data/generated/${index}.png`,
  downloadUrl: `/api/history/image-${index}/download`,
}));

const activeJobs = [{
  id: 'job-running',
  prompt: 'prompt running',
  size: '1536x1024',
  quality: 'high',
  colorSchemeId: 'preset-okabe-ito',
  count: 4,
  status: 'running',
  completedCount: 1,
  failedCount: 0,
  errorMessage: null,
  createdAt: '2026-04-25T00:00:00Z',
  updatedAt: '2026-04-25T00:00:00Z',
}];

describe('GeneratePage', () => {
  it('renders the studio shell with a composer sidebar, canvas stage, and filmstrip', () => {
    const html = renderToStaticMarkup(
      <GeneratePage
        settings={{ baseUrl: '', apiKey: '' }}
        workspace={DEFAULT_WORKSPACE}
        palettes={[palette]}
        activeJobs={activeJobs}
        history={historyItems}
        onWorkspaceChange={() => {}}
        onUploadReferenceImages={async () => {}}
        onRemoveReferenceImage={async () => {}}
        onGenerate={async () => {}}
        onOpenSettings={() => {}}
        onRefreshHistory={async () => {}}
      />,
    );

    expect(html).toContain('描述你需要的图片');
    expect(html).toContain('模板库');
    expect(html).toContain('class="template-trigger"');
    expect(html).not.toContain('class="prompt-template-popover"');
    expect(html).toContain('awesome-gpt-image-2-prompts');
    expect(html).toContain('参考图');
    expect(html).toContain('当前任务');
    expect(html).toContain('最近结果');
    expect(html).toContain('去设置');
    expect(html).toContain('class="generation-workbench"');
    expect(html).toContain('class="generation-sidebar"');
    expect(html).toContain('class="generation-preview"');
    expect(html).toContain('class="preview-frame"');
    expect(html).toContain('class="preview-meta"');
    expect(html).toContain('class="preview-meta-item"');
    expect(html).toContain('class="task-meter"');
    expect(html).toContain('1 / 4');
    expect(html).toContain('class="recent-results"');
    expect(html).toContain('class="palette-preview-row sidebar-divider"');
    expect(html).toContain('配色预览');
    expect(html).toContain('auto');
    expect(html).toContain('<span>质量</span><select><option value="auto">auto</option><option value="low">low</option>');
    expect(html).toContain('class="generate-notices"');
    expect(html).toContain('2048x2048');
    expect(html).toContain('2048x1152');
    expect(html).toContain('3840x2160');
    expect(html).toContain('2160x3840');
    expect(html).toContain('无配色');
    expect(html).not.toContain('不注入配色 prompt');
    expect(html).not.toContain('2560 x 1440');
    expect(html).not.toContain('4096 x 4096');
    expect(html).toContain('data-horizontal-wheel="true"');
    expect(html).toContain('aria-label="最近结果"');
    expect(html).toContain('aria-label="查看 prompt 0 的生成详情"');
    expect((html.match(/class="gallery-thumb"/g) ?? []).length).toBe(12);
    expect(html).not.toContain('prompt 12');
    expect(html).toContain('生成图片');
    expect(html).toContain('aria-label="全屏查看最近生成结果"');
  });

  it('opens the latest generated image in a fullscreen viewer', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    try {
      act(() => {
        root.render(
          <GeneratePage
            settings={{ baseUrl: 'https://img.aiapis.help/', apiKey: 'sk-test' }}
            workspace={DEFAULT_WORKSPACE}
            palettes={[palette]}
            activeJobs={[]}
            history={[historyItems[0]]}
            onWorkspaceChange={() => {}}
            onUploadReferenceImages={async () => {}}
            onRemoveReferenceImage={async () => {}}
            onGenerate={async () => {}}
            onOpenSettings={() => {}}
            onRefreshHistory={async () => {}}
          />,
        );
      });

      expect(container.querySelector('.fullscreen-image-dialog')).toBeNull();
      const previewButton = container.querySelector('.preview-image-button');
      expect(previewButton).not.toBeNull();

      act(() => {
        (previewButton as HTMLButtonElement).click();
      });

      const dialog = container.querySelector('.fullscreen-image-dialog');
      expect(dialog).not.toBeNull();
      expect(dialog?.textContent).toContain('关闭');
      expect(container.querySelector('.fullscreen-image-surface')?.getAttribute('style')).toContain('/data/generated/0.png');
    } finally {
      act(() => {
        root.unmount();
      });
      container.remove();
    }
  });

  it('renders multiple uploaded reference images with indexed remove actions', () => {
    const html = renderToStaticMarkup(
      <GeneratePage
        settings={{ baseUrl: 'https://img.aiapis.help/', apiKey: 'sk-test' }}
        workspace={{
          ...DEFAULT_WORKSPACE,
          referenceImages: [
            { path: '/data/workspace/reference-images/a.png', name: 'a.png', mimeType: 'image/png' },
            { path: '/data/workspace/reference-images/b.png', name: 'b.png', mimeType: 'image/png' },
          ],
        }}
        palettes={[palette]}
        activeJobs={[]}
        history={[]}
        onWorkspaceChange={() => {}}
        onUploadReferenceImages={async () => {}}
        onRemoveReferenceImage={async () => {}}
        onGenerate={async () => {}}
        onOpenSettings={() => {}}
        onRefreshHistory={async () => {}}
      />,
    );

    expect(html).toContain('2 张');
    expect(html).toContain('class="reference-grid"');
    expect((html.match(/class="reference-tile"/g) ?? []).length).toBe(2);
    expect(html).toContain('aria-label="移除参考图 1"');
    expect(html).toContain('aria-label="移除参考图 2"');
    expect(html).toContain('multiple=""');
  });

  it('renders a restrained empty gallery state when there are no generated images yet', () => {
    const html = renderToStaticMarkup(
      <GeneratePage
        settings={{ baseUrl: '', apiKey: '' }}
        workspace={DEFAULT_WORKSPACE}
        palettes={[palette]}
        activeJobs={[]}
        history={[]}
        onWorkspaceChange={() => {}}
        onUploadReferenceImages={async () => {}}
        onRemoveReferenceImage={async () => {}}
        onGenerate={async () => {}}
        onOpenSettings={() => {}}
        onRefreshHistory={async () => {}}
      />,
    );

    expect(html).toContain('class="preview-empty"');
    expect(html).toContain('class="gallery-empty-state"');
    expect(html).not.toContain('gallery-thumb--placeholder');
  });

  it('surfaces failed generation records and submission errors instead of staying silent', () => {
    const failedItem = {
      ...historyItems[0],
      id: 'failed-image',
      jobId: 'failed-job',
      prompt: 'failed prompt',
      status: 'failed',
      imagePath: null,
      previewUrl: null,
      errorMessage: 'Gateway HTTP 401: invalid key',
    };
    const html = renderToStaticMarkup(
      <GeneratePage
        settings={{ baseUrl: 'https://img.aiapis.help/', apiKey: 'sk-test' }}
        workspace={DEFAULT_WORKSPACE}
        palettes={[palette]}
        activeJobs={[]}
        history={[failedItem]}
        generationNotice={{ kind: 'failed', message: 'Gateway HTTP 401: invalid key' }}
        onWorkspaceChange={() => {}}
        onUploadReferenceImages={async () => {}}
        onRemoveReferenceImage={async () => {}}
        onGenerate={async () => {}}
        onOpenSettings={() => {}}
        onRefreshHistory={async () => {}}
      />,
    );

    expect(html).toContain('生成失败');
    expect(html).toContain('Gateway HTTP 401: invalid key');
    expect(html).toContain('class="gallery-thumb gallery-thumb--failed"');
  });

  it('clears the right-side preview while a new generation is in flight', () => {
    const html = renderToStaticMarkup(
      <GeneratePage
        settings={{ baseUrl: 'https://img.aiapis.help/', apiKey: 'sk-test' }}
        workspace={DEFAULT_WORKSPACE}
        palettes={[palette]}
        activeJobs={[]}
        history={[historyItems[0]]}
        generationNotice={{ kind: 'running', message: '正在提交生成任务...' }}
        isGenerating
        onWorkspaceChange={() => {}}
        onUploadReferenceImages={async () => {}}
        onRemoveReferenceImage={async () => {}}
        onGenerate={async () => {}}
        onOpenSettings={() => {}}
        onRefreshHistory={async () => {}}
      />,
    );

    expect(html).not.toContain('class="preview-image-surface"');
    expect(html).toContain('正在生成');
    expect(html).toContain('提交中');
    expect(html).toContain('class="preview-empty"');
  });
});
