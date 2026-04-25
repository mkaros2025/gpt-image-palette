import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { ResultDetailDialog } from '../src/components/ResultDetailDialog';

const item = {
  id: 'image-1',
  jobId: 'job-1',
  prompt: 'gallery prompt',
  size: '1536x1024',
  quality: 'high',
  colorSchemeId: 'preset-okabe-ito',
  customColors: null,
  referenceImagePath: null,
  imagePath: 'generated/image.png',
  status: 'completed',
  width: 1536,
  height: 1024,
  fileSize: 1024,
  errorMessage: null,
  position: 0,
  createdAt: '2026-04-25T00:00:00Z',
  updatedAt: '2026-04-25T00:00:00Z',
  previewUrl: '/data/generated/image.png',
  downloadUrl: '/api/history/image-1/download',
};

describe('ResultDetailDialog', () => {
  it('renders prototype detail fields and actions', () => {
    const html = renderToStaticMarkup(
      <ResultDetailDialog
        item={item}
        paletteName="Okabe-Ito"
        onClose={() => {}}
        onDelete={async () => {}}
      />,
    );

    expect(html).toContain('class="detail-card"');
    expect(html).toContain('gallery prompt');
    expect(html).toContain('1536x1024');
    expect(html).toContain('Okabe-Ito');
    expect(html).toContain('时间');
    expect(html).toContain('下载');
    expect(html).toContain('删除');
    expect(html).toContain('aria-label="生成详情"');
    expect(html).toContain('aria-label="关闭生成详情"');
  });
});
