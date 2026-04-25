import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { ResultDetailDialog } from '../src/components/ResultDetailDialog';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const item = {
  id: 'image-1',
  jobId: 'job-1',
  prompt: 'gallery prompt',
  size: '1536x1024',
  quality: 'high',
  colorSchemeId: 'preset-okabe-ito',
  customColors: null,
  referenceImages: [],
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
    expect(html).toContain('aria-label="全屏查看生成图片"');
    expect(html).toContain('aria-label="复制 Prompt"');
    expect(html).toContain('点击展开全部');
  });

  it('toggles the prompt block between collapsed and expanded states', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const longPrompt = `9:16 vertical — a detailed prompt that should not dominate the dialog by default.\n${'extra detail '.repeat(50)}`;

    try {
      act(() => {
        root.render(
          <ResultDetailDialog
            item={{ ...item, prompt: longPrompt }}
            paletteName="Okabe-Ito"
            onClose={() => {}}
            onDelete={async () => {}}
          />,
        );
      });

      const promptToggle = container.querySelector('.detail-prompt-toggle');
      expect(promptToggle).not.toBeNull();
      expect(promptToggle?.getAttribute('aria-expanded')).toBe('false');
      expect(promptToggle?.textContent).toContain('点击展开全部');

      act(() => {
        (promptToggle as HTMLButtonElement).click();
      });

      expect(promptToggle?.getAttribute('aria-expanded')).toBe('true');
      expect(promptToggle?.textContent).toContain('点击收起');
      expect(promptToggle?.className).toContain('detail-prompt--expanded');
    } finally {
      act(() => {
        root.unmount();
      });
      container.remove();
    }
  });

  it('copies the prompt text when clicking the prompt body', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    try {
      act(() => {
        root.render(
          <ResultDetailDialog
            item={item}
            paletteName="Okabe-Ito"
            onClose={() => {}}
            onDelete={async () => {}}
          />,
        );
      });

      const promptCopy = container.querySelector('.detail-prompt-copy');
      expect(promptCopy).not.toBeNull();

      await act(async () => {
        (promptCopy as HTMLButtonElement).click();
      });

      expect(writeText).toHaveBeenCalledWith('gallery prompt');
      expect(container.querySelector('.detail-prompt-toggle')?.textContent).toContain('已复制');
    } finally {
      act(() => {
        root.unmount();
      });
      container.remove();
    }
  });

  it('opens the detail image in a fullscreen viewer', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    try {
      act(() => {
        root.render(
          <ResultDetailDialog
            item={item}
            paletteName="Okabe-Ito"
            onClose={() => {}}
            onDelete={async () => {}}
          />,
        );
      });

      expect(container.querySelector('.fullscreen-image-dialog')).toBeNull();
      const imageButton = container.querySelector('.detail-image-button');
      expect(imageButton).not.toBeNull();

      act(() => {
        (imageButton as HTMLButtonElement).click();
      });

      const dialog = container.querySelector('.fullscreen-image-dialog');
      expect(dialog).not.toBeNull();
      expect(container.querySelector('.fullscreen-image-surface')?.getAttribute('style')).toContain('/data/generated/image.png');
    } finally {
      act(() => {
        root.unmount();
      });
      container.remove();
    }
  });

  it('keeps fullscreen image open when parent rerenders the same item', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    try {
      act(() => {
        root.render(
          <ResultDetailDialog
            item={item}
            paletteName="Okabe-Ito"
            onClose={() => {}}
            onDelete={async () => {}}
          />,
        );
      });

      act(() => {
        (container.querySelector('.detail-image-button') as HTMLButtonElement).click();
      });

      expect(container.querySelector('.fullscreen-image-dialog')).not.toBeNull();

      act(() => {
        root.render(
          <ResultDetailDialog
            item={item}
            paletteName="Okabe-Ito"
            onClose={() => {}}
            onDelete={async () => {}}
          />,
        );
      });

      expect(container.querySelector('.fullscreen-image-dialog')).not.toBeNull();
    } finally {
      act(() => {
        root.unmount();
      });
      container.remove();
    }
  });
});
