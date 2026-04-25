import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { App } from '../src/App';

describe('App shell', () => {
  it('does not render marketing or onboarding copy in the default shell', () => {
    const html = renderToStaticMarkup(<App />);

    expect(html).toContain('gpt-image-palette');
    expect(html).toContain('生成');
    expect(html).toContain('历史');
    expect(html).toContain('配色');
    expect(html).toContain('设置');
    expect(html).toContain('class="brand-mark"');
    expect(html).toContain('aria-label="gpt-image-palette logo"');
    expect(html).toContain('class="topnav topnav--glass"');
    expect(html).not.toContain('欢迎');
    expect(html).not.toContain('开始使用');
  });
});
