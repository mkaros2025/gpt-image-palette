import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { GeneratePage } from '../src/components/GeneratePage';
import { DEFAULT_WORKSPACE } from '../src/lib/workspacePayload';

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
  referenceImagePath: null,
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

describe('GeneratePage', () => {
  it('renders the studio shell with a composer sidebar, canvas stage, and filmstrip', () => {
    const html = renderToStaticMarkup(
      <GeneratePage
        settings={{ baseUrl: '', apiKey: '', updatedAt: '' }}
        workspace={DEFAULT_WORKSPACE}
        palettes={[palette]}
        activeJobs={[]}
        history={historyItems}
        onWorkspaceChange={() => {}}
        onSaveWorkspace={async () => {}}
        onUploadReferenceImage={async () => {}}
        onRemoveReferenceImage={async () => {}}
        onGenerate={async () => {}}
        onOpenSettings={() => {}}
        onRefreshHistory={async () => {}}
      />,
    );

    expect(html).toContain('描述你需要的图片');
    expect(html).toContain('参考图');
    expect(html).toContain('当前任务');
    expect(html).toContain('最近结果');
    expect(html).toContain('去设置');
    expect(html).toContain('class="generate-studio"');
    expect(html).toContain('class="studio-composer"');
    expect(html).toContain('class="studio-canvas"');
    expect(html).toContain('class="canvas-stage"');
    expect(html).toContain('class="canvas-meta-bar"');
    expect(html).toContain('class="studio-filmstrip"');
    expect(html).toContain('class="palette-preview-row generate-compact-surface"');
    expect(html).toContain('配色预览');
    expect(html).toContain('auto');
    expect(html).toContain('2048x2048');
    expect(html).toContain('2048x1152');
    expect(html).toContain('3840x2160');
    expect(html).toContain('2160x3840');
    expect(html).toContain('无配色');
    expect(html).not.toContain('自适应');
    expect(html).not.toContain('方形');
    expect(html).not.toContain('横版');
    expect(html).not.toContain('竖版');
    expect(html).not.toContain('不注入配色 prompt');
    expect(html).not.toContain('2560 x 1440');
    expect(html).not.toContain('4096 x 4096');
    expect(html).toContain('data-horizontal-wheel="true"');
    expect(html).toContain('aria-label="最近结果 filmstrip"');
    expect(html).toContain('aria-label="查看 prompt 0 的生成详情"');
    expect((html.match(/class="gallery-thumb"/g) ?? []).length).toBe(12);
    expect(html).not.toContain('prompt 12');
    expect(html).toContain('生成图片');
  });

  it('renders a restrained empty gallery state when there are no generated images yet', () => {
    const html = renderToStaticMarkup(
      <GeneratePage
        settings={{ baseUrl: '', apiKey: '', updatedAt: '' }}
        workspace={DEFAULT_WORKSPACE}
        palettes={[palette]}
        activeJobs={[]}
        history={[]}
        onWorkspaceChange={() => {}}
        onSaveWorkspace={async () => {}}
        onUploadReferenceImage={async () => {}}
        onRemoveReferenceImage={async () => {}}
        onGenerate={async () => {}}
        onOpenSettings={() => {}}
        onRefreshHistory={async () => {}}
      />,
    );

    expect(html).toContain('class="canvas-empty-state"');
    expect(html).toContain('class="gallery-empty-state"');
    expect(html).not.toContain('gallery-thumb--placeholder');
  });
});
