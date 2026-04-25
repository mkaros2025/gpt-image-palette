import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { HistoryPage } from '../src/components/HistoryPage';

const item = {
  id: 'image-1',
  jobId: 'job-1',
  prompt: 'cell diagram prompt',
  size: '1024x1024',
  quality: 'high',
  colorSchemeId: 'preset-okabe-ito',
  customColors: null,
  referenceImagePath: null,
  imagePath: 'generated/image.png',
  status: 'completed',
  width: 1024,
  height: 1024,
  fileSize: 1024,
  errorMessage: null,
  position: 0,
  createdAt: '2026-04-24T00:00:00Z',
  updatedAt: '2026-04-24T00:00:00Z',
  previewUrl: '/data/generated/image.png',
  downloadUrl: '/api/history/image-1/download',
};

const palettes = [{
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
}];

describe('HistoryPage', () => {
  it('renders a table-first history view with reuse as a primary row action', () => {
    const html = renderToStaticMarkup(
      <HistoryPage
        items={[item]}
        palettes={palettes}
        query=""
        onQueryChange={() => {}}
        onSearch={async () => {}}
        onReuse={() => {}}
        onDelete={async () => {}}
      />,
    );

    expect(html).toContain('cell diagram prompt');
    expect(html).toContain('1024x1024');
    expect(html).toContain('high');
    expect(html).toContain('带回生成页');
    expect(html).toContain('共 1 张历史图片');
    expect(html).toContain('点击缩略图查看详情');
    expect(html).toContain('Okabe-Ito');
    expect(html).toContain('class="history-thumb-button"');
    expect(html).toContain('aria-label="查看 cell diagram prompt 的生成详情"');
    expect(html).toContain('class="quiet-button row-primary-action"');
    expect(html).toContain('class="table-icon-action"');
    expect(html).toContain('aria-label="下载 cell diagram prompt"');
    expect(html).toContain('aria-label="删除 cell diagram prompt"');
    expect(html).toContain('class="panel history-panel"');
  });

  it('renders a designed empty state instead of an empty table body', () => {
    const html = renderToStaticMarkup(
      <HistoryPage
        items={[]}
        palettes={palettes}
        query=""
        onQueryChange={() => {}}
        onSearch={async () => {}}
        onReuse={() => {}}
        onDelete={async () => {}}
      />,
    );

    expect(html).toContain('class="history-empty-state"');
    expect(html).toContain('还没有历史图片');
    expect(html).not.toContain('<tbody></tbody>');
  });
});
