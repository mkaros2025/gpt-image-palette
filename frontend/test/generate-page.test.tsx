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

describe('GeneratePage', () => {
  it('renders the confirmed left input column, right latest result column, and bottom gallery', () => {
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

    expect(html).toContain('Prompt');
    expect(html).toContain('参考图');
    expect(html).toContain('当前任务');
    expect(html).toContain('最近一次生成');
    expect(html).toContain('最近结果');
    expect(html).toContain('去设置');
  });
});
