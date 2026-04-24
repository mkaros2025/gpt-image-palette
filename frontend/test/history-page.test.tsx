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

describe('HistoryPage', () => {
  it('renders a table-first history view with reuse as a primary row action', () => {
    const html = renderToStaticMarkup(
      <HistoryPage
        items={[item]}
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
  });
});
