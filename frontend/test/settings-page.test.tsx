import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { SettingsPage } from '../src/components/SettingsPage';

describe('SettingsPage', () => {
  it('renders baseURL, full API key, save, and manual test controls', () => {
    const html = renderToStaticMarkup(
      <SettingsPage
        settings={{ baseUrl: 'http://localhost:43175', apiKey: 'sk-visible', updatedAt: '' }}
        status={null}
        onSettingsChange={() => {}}
        onSave={async () => {}}
        onTestConnection={async () => {}}
      />,
    );

    expect(html).toContain('baseURL');
    expect(html).toContain('API Key');
    expect(html).toContain('sk-visible');
    expect(html).toContain('保存');
    expect(html).toContain('测试连接');
    expect(html).toContain('class="settings-page"');
    expect(html).not.toContain('连接状态');
    expect(html).not.toContain('配置来源');
    expect(html).not.toContain('后端本地存储');
  });
});
