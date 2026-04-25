# Prototype Gallery Frontend Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the current React frontend so the production UI matches the committed HTML prototypes in `docs/prototypes/generate-style-directions.html` and `docs/prototypes/other-pages-prototype.html`.

**Architecture:** Keep the existing React + Vite + TypeScript frontend and Fastify backend. This work is primarily a frontend component/CSS rebuild: preserve existing API contracts, workspace persistence, generation, history, palette, and settings behavior, while replacing the visual structure with the cold white gallery style from the prototypes. Backend changes are not expected; if an implementation step discovers a missing field that cannot be derived on the frontend, add a backend test before changing an API response.

**Tech Stack:** React 19, Vite, TypeScript, Vitest, Fastify, SQLite, CSS modules via global `styles.css`.

---

## Source Prototype Contract

Implement these visual and UX constraints exactly:

- Use the cold gallery palette from the prototypes: `--paper: #f7f8fa`, `--surface: #ffffff`, `--surface-soft: #fbfcfd`, `--ink: #17191b`, `--muted: #707780`, `--line: #dde2e7`, `--accent: #2f3842`.
- Use one shared radius: `--radius: 5px`.
- Use Apple/Google-style stable sans fonts: `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `Roboto`, `"Noto Sans SC"`, `"Noto Sans"`, `Arial`, `sans-serif`.
- Header must be compact: brand at left, four-page nav at right, no heavy full-row tab bar.
- Navigation uses a small glass capsule: border, translucent white background, `backdrop-filter: blur(22px) saturate(1.18)`, subtle shadow.
- Generate page uses a left form panel and right result/status panel with equal height on desktop.
- Generate page bottom gallery occupies the full row, shows up to 12 latest images, and supports horizontal wheel scrolling with damped motion.
- Gallery images have no visible wrapper border. Hover effect belongs to the image: bottom lift/perspective plus shadow.
- Prompt label in production UI must read `描述你需要的图片`.
- No templates, prompt segmentation, welcome copy, marketing copy, or unnecessary modal flows.
- Palette management page keeps the existing UX but upgrades UI to the prototype: sidebar cards, palette hero, 8 fixed semantic slots.
- Settings page keeps the existing UX but upgrades UI to the prototype: settings form plus connection/status card.

## File Structure

### Create

- `frontend/src/components/BrandLogo.tsx`  
  Shared compact logo used in the app shell.
- `frontend/src/components/PaletteSwatches.tsx`  
  Shared 8-slot swatch strip for generate, palette list, palette hero, and details.
- `frontend/src/components/ReferenceImageDialog.tsx`  
  Lightweight preview modal for uploaded reference images.
- `frontend/src/lib/format.ts`  
  Shared display helpers: date formatting, palette label lookup, file size formatting if needed.
- `frontend/src/lib/horizontalScroll.ts`  
  Pure wheel target helper plus React hook for damped horizontal gallery scrolling.
- `frontend/test/style-contract.test.ts`  
  CSS contract test for prototype tokens and key class names.
- `frontend/test/horizontal-scroll.test.ts`  
  Unit test for horizontal wheel target calculation.
- `frontend/test/result-detail-dialog.test.tsx`  
  Static render test for result detail fields.

### Modify

- `frontend/src/App.tsx`  
  Replace inline text brand with `BrandLogo`, pass palettes to history where palette names are needed.
- `frontend/src/components/GeneratePage.tsx`  
  Rebuild markup to match prototype: left controls, palette preview row, reference thumbnail/preview, right status/latest result, full-width gallery strip.
- `frontend/src/components/HistoryPage.tsx`  
  Keep table-first UX; add prototype toolbar/panel structure, palette labels, thumbnail detail dialog.
- `frontend/src/components/PalettesPage.tsx`  
  Keep create/copy/save/default/delete behavior; add sidebar cards, hero preview, swatches, refined 8-slot editor.
- `frontend/src/components/SettingsPage.tsx`  
  Keep save/test behavior; add split layout and connection info card.
- `frontend/src/components/ResultDetailDialog.tsx`  
  Match prototype modal; show prompt, size, quality, palette, time, download, delete, close.
- `frontend/src/styles.css`  
  Replace warm current style with prototype cold white gallery style.
- `frontend/test/app-shell.test.tsx`  
  Assert compact shell, logo, glass nav, no welcome copy.
- `frontend/test/generate-page.test.tsx`  
  Assert generate layout, palette preview, reference thumbnail behavior, 12-item gallery limit.
- `frontend/test/history-page.test.tsx`  
  Assert prototype history toolbar/table/detail affordance and palette label.
- `frontend/test/palettes-page.test.tsx`  
  Assert sidebar cards, hero preview, 8-slot editor.
- `frontend/test/settings-page.test.tsx`  
  Assert split settings/status UI.

### Do Not Modify Unless A Test Proves It Is Needed

- Backend repositories and routes.
- Database schema.
- Generation model calling code.
- API client paths.

Reason: all required data is already present in current API responses or can be derived from existing frontend state.

---

## Task 1: Add Visual Contract Tests And Shared Helpers

**Files:**
- Create: `frontend/test/style-contract.test.ts`
- Create: `frontend/test/horizontal-scroll.test.ts`
- Create: `frontend/src/lib/horizontalScroll.ts`
- Create: `frontend/src/lib/format.ts`
- Modify: `frontend/test/app-shell.test.tsx`

- [ ] **Step 1: Write the failing CSS contract test**

Create `frontend/test/style-contract.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/styles.css'), 'utf8');

describe('prototype style contract', () => {
  it('uses the cold white gallery tokens from the prototype', () => {
    expect(css).toContain('--paper: #f7f8fa');
    expect(css).toContain('--surface: #ffffff');
    expect(css).toContain('--ink: #17191b');
    expect(css).toContain('--accent: #2f3842');
    expect(css).toContain('--radius: 5px');
    expect(css).toContain('backdrop-filter: blur(22px) saturate(1.18)');
  });

  it('contains gallery and modal classes required by the prototype', () => {
    expect(css).toContain('.gallery-strip');
    expect(css).toContain('.gallery-thumb:hover img');
    expect(css).toContain('scroll-snap-type: x proximity');
    expect(css).toContain('.detail-card');
    expect(css).toContain('.palette-hero');
    expect(css).toContain('.settings-status-card');
  });
});
```

- [ ] **Step 2: Write the failing horizontal scroll test**

Create `frontend/test/horizontal-scroll.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { resolveHorizontalWheelTarget } from '../src/lib/horizontalScroll';

describe('resolveHorizontalWheelTarget', () => {
  it('uses vertical wheel motion as horizontal motion and clamps to bounds', () => {
    expect(resolveHorizontalWheelTarget({
      scrollLeft: 20,
      scrollWidth: 1000,
      clientWidth: 400,
      deltaX: 0,
      deltaY: 100,
    })).toBe(155);

    expect(resolveHorizontalWheelTarget({
      scrollLeft: 580,
      scrollWidth: 1000,
      clientWidth: 400,
      deltaX: 0,
      deltaY: 100,
    })).toBe(600);

    expect(resolveHorizontalWheelTarget({
      scrollLeft: 10,
      scrollWidth: 1000,
      clientWidth: 400,
      deltaX: 0,
      deltaY: -100,
    })).toBe(0);
  });

  it('returns the current position when content does not overflow', () => {
    expect(resolveHorizontalWheelTarget({
      scrollLeft: 12,
      scrollWidth: 300,
      clientWidth: 400,
      deltaX: 0,
      deltaY: 100,
    })).toBe(12);
  });
});
```

- [ ] **Step 3: Update app shell test before implementation**

Modify `frontend/test/app-shell.test.tsx` so the existing test also asserts the prototype shell:

```ts
expect(html).toContain('class="brand-mark"');
expect(html).toContain('aria-label="gpt-image-palette logo"');
expect(html).toContain('class="topnav topnav--glass"');
```

- [ ] **Step 4: Run tests to verify they fail**

Run:

```bash
npm run test -w frontend -- style-contract.test.ts horizontal-scroll.test.ts app-shell.test.tsx
```

Expected:

- `style-contract.test.ts` fails because current CSS uses warm tokens and lacks prototype classes.
- `horizontal-scroll.test.ts` fails because `frontend/src/lib/horizontalScroll.ts` does not exist.
- `app-shell.test.tsx` fails because the shell has no `BrandLogo` markup and no `topnav--glass`.

- [ ] **Step 5: Implement horizontal scroll helper**

Create `frontend/src/lib/horizontalScroll.ts`:

```ts
import { useEffect, useRef } from 'react';

type WheelTargetInput = {
  scrollLeft: number;
  scrollWidth: number;
  clientWidth: number;
  deltaX: number;
  deltaY: number;
};

export function resolveHorizontalWheelTarget(input: WheelTargetInput) {
  const max = Math.max(0, input.scrollWidth - input.clientWidth);
  if (max === 0) {
    return input.scrollLeft;
  }

  const delta = Math.abs(input.deltaX) > Math.abs(input.deltaY) ? input.deltaX : input.deltaY;
  return Math.max(0, Math.min(max, input.scrollLeft + delta * 1.35));
}

export function useDampedHorizontalScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const rail = ref.current;
    if (!rail) {
      return undefined;
    }

    let target = rail.scrollLeft;
    let current = rail.scrollLeft;
    let frame = 0;

    const animate = () => {
      current += (target - current) * 0.18;
      rail.scrollLeft = current;

      if (Math.abs(target - current) > 0.4) {
        frame = window.requestAnimationFrame(animate);
      } else {
        rail.scrollLeft = target;
        frame = 0;
      }
    };

    const onWheel = (event: WheelEvent) => {
      const next = resolveHorizontalWheelTarget({
        scrollLeft: target,
        scrollWidth: rail.scrollWidth,
        clientWidth: rail.clientWidth,
        deltaX: event.deltaX,
        deltaY: event.deltaY,
      });

      if (next === target && rail.scrollWidth <= rail.clientWidth) {
        return;
      }

      target = next;

      if (!frame) {
        current = rail.scrollLeft;
        frame = window.requestAnimationFrame(animate);
      }

      event.preventDefault();
    };

    rail.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      rail.removeEventListener('wheel', onWheel);
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, []);

  return ref;
}
```

- [ ] **Step 6: Implement display helpers**

Create `frontend/src/lib/format.ts`:

```ts
import type { ColorScheme } from './types';

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return '未知时间';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export function getPaletteLabel(palettes: ColorScheme[], id: string) {
  return palettes.find((palette) => palette.id === id)?.name ?? id;
}
```

- [ ] **Step 7: Keep tests red for CSS and app shell, green for helper**

Run:

```bash
npm run test -w frontend -- horizontal-scroll.test.ts style-contract.test.ts app-shell.test.tsx
```

Expected:

- `horizontal-scroll.test.ts` passes.
- CSS and app shell tests still fail until the shell and CSS tasks are implemented.

---

## Task 2: Rebuild App Shell And Shared Visual Components

**Files:**
- Create: `frontend/src/components/BrandLogo.tsx`
- Create: `frontend/src/components/PaletteSwatches.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/test/app-shell.test.tsx`

- [ ] **Step 1: Create shared logo component**

Create `frontend/src/components/BrandLogo.tsx`:

```tsx
export function BrandLogo() {
  return (
    <span className="brand-mark">
      <svg className="brand-logo" viewBox="0 0 32 32" role="img" aria-label="gpt-image-palette logo">
        <rect x="5" y="4" width="19" height="24" rx="5" fill="#fff" stroke="#181817" strokeWidth="1.4" />
        <path d="M11 10h8M11 15h11M11 20h6" stroke="#181817" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="24" cy="22" r="5" fill="#2f3842" />
        <circle cx="22.4" cy="20.8" r="1.2" fill="#f7f8fa" />
        <circle cx="25.4" cy="22.6" r="1.1" fill="#d8c777" />
      </svg>
      <span>gpt-image-palette</span>
    </span>
  );
}
```

- [ ] **Step 2: Create shared swatch component**

Create `frontend/src/components/PaletteSwatches.tsx`:

```tsx
import { PALETTE_SLOTS } from '../lib/paletteSlots';
import type { PaletteColors } from '../lib/types';

type Props = {
  colors: PaletteColors;
  className?: string;
  label?: string;
};

export function PaletteSwatches({ colors, className = '', label = '配色预览' }: Props) {
  const classNames = ['palette-swatches', className].filter(Boolean).join(' ');

  return (
    <span className={classNames} aria-label={label} role="img">
      {PALETTE_SLOTS.map((slot) => (
        <i key={slot} title={slot} style={{ backgroundColor: colors[slot] }} />
      ))}
    </span>
  );
}
```

- [ ] **Step 3: Replace app shell header**

Modify `frontend/src/App.tsx`:

```tsx
import { BrandLogo } from './components/BrandLogo';
```

Replace the header JSX with:

```tsx
<header className="topbar">
  <button className="brand-button" type="button" onClick={() => selectPage('generate')}>
    <BrandLogo />
  </button>
  <nav className="topnav topnav--glass" aria-label="主导航">
    {NAV_ITEMS.map((item) => (
      <button
        key={item.id}
        className={item.id === page ? 'nav-link nav-link--active' : 'nav-link'}
        type="button"
        onClick={() => selectPage(item.id)}
      >
        {item.label}
      </button>
    ))}
  </nav>
</header>
```

- [ ] **Step 4: Pass palettes to HistoryPage**

In `frontend/src/App.tsx`, update the `HistoryPage` call:

```tsx
<HistoryPage
  items={history}
  palettes={palettes}
  query={historyQuery}
  onQueryChange={setHistoryQuery}
  onSearch={searchHistory}
  onReuse={reuseHistoryItem}
  onDelete={confirmAndDeleteHistoryItem}
/>
```

- [ ] **Step 5: Run shell test**

Run:

```bash
npm run test -w frontend -- app-shell.test.tsx
```

Expected:

- `app-shell.test.tsx` passes after CSS-independent shell markup exists.

---

## Task 3: Rebuild Generate Page Markup And Behavior

**Files:**
- Modify: `frontend/src/components/GeneratePage.tsx`
- Modify: `frontend/test/generate-page.test.tsx`

- [ ] **Step 1: Expand generate page test**

Modify `frontend/test/generate-page.test.tsx` to create 13 history items and assert 12 rendered gallery buttons:

```ts
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
```

Add assertions:

```ts
expect(html).toContain('class="generate-layout"');
expect(html).toContain('class="panel panel--input gallery-panel"');
expect(html).toContain('class="panel panel--preview gallery-panel"');
expect(html).toContain('配色预览');
expect(html).toContain('data-horizontal-wheel="true"');
expect((html.match(/class="gallery-thumb"/g) ?? []).length).toBe(12);
expect(html).not.toContain('prompt 12');
expect(html).toContain('生成图片');
```

- [ ] **Step 2: Run generate test to verify it fails**

Run:

```bash
npm run test -w frontend -- generate-page.test.tsx
```

Expected:

- Test fails because current component uses `generate-grid`, no prototype panel classes, no swatch row, no horizontal wheel marker, and does not cap gallery with the new class names.

- [ ] **Step 3: Implement generate page prototype structure**

Modify `frontend/src/components/GeneratePage.tsx` with these structural rules:

```tsx
const selectedPalette = props.palettes.find((palette) => palette.id === props.workspace.colorSchemeId) ?? props.palettes[0] ?? null;
const missingSettings = !props.settings.baseUrl || !props.settings.apiKey;
const latest = props.history[0] ?? null;
const recent = props.history.slice(0, 12);
const galleryRef = useDampedHorizontalScroll<HTMLDivElement>();
```

Use this class structure in the returned JSX:

```tsx
<div className="generate-page">
  <section className="generate-layout">
    <form className="panel panel--input gallery-panel" ...>
      <div className="label-row">
        <span className="label label--strong">Prompt</span>
        <span className="label">描述你需要的图片</span>
      </div>
      <textarea className="prompt-input" ... />
      <div className="control-grid">...</div>
      {selectedPalette ? (
        <div className="palette-preview-row">
          <span className="label">配色预览</span>
          <PaletteSwatches colors={selectedPalette.colors} />
        </div>
      ) : null}
      <div className="reference-upload">...</div>
      <div className="generate-actions">...</div>
    </form>

    <aside className="panel panel--preview gallery-panel">
      <div className="status-row">...</div>
      <div className="latest-frame">...</div>
      <div className="latest-meta">...</div>
    </aside>
  </section>

  <section className="recent-gallery">
    <div className="gallery-header">...</div>
    <div className="gallery-strip" data-horizontal-wheel="true" ref={galleryRef}>
      ...
    </div>
  </section>
</div>
```

Implement the gallery items as buttons:

```tsx
{recent.map((item) => (
  <button key={item.id} type="button" className="gallery-thumb" onClick={() => setSelectedResult(item)}>
    {item.previewUrl ? <img src={item.previewUrl} alt="" /> : <span>无预览</span>}
  </button>
))}
```

- [ ] **Step 4: Preserve existing generate behavior**

Keep these existing behaviors unchanged:

- Submit calls `props.onGenerate()`.
- Missing baseURL/API Key only renders near the generate button with the `去设置` action.
- Generate button is disabled when prompt is empty or settings are missing.
- Workspace updates still call `props.onWorkspaceChange`.
- Reference image upload still calls `props.onUploadReferenceImage(file)`.
- Reference image remove still calls `props.onRemoveReferenceImage()`.
- Recent image click opens `ResultDetailDialog`.

- [ ] **Step 5: Run generate test**

Run:

```bash
npm run test -w frontend -- generate-page.test.tsx
```

Expected:

- `generate-page.test.tsx` passes.

---

## Task 4: Add Reference Preview And Result Detail Polish

**Files:**
- Create: `frontend/src/components/ReferenceImageDialog.tsx`
- Create: `frontend/test/result-detail-dialog.test.tsx`
- Modify: `frontend/src/components/ResultDetailDialog.tsx`
- Modify: `frontend/src/components/GeneratePage.tsx`

- [ ] **Step 1: Write result detail dialog test**

Create `frontend/test/result-detail-dialog.test.tsx`:

```tsx
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
  });
});
```

- [ ] **Step 2: Run dialog test to verify it fails**

Run:

```bash
npm run test -w frontend -- result-detail-dialog.test.tsx
```

Expected:

- Test fails because `ResultDetailDialog` has no `paletteName` prop and does not render prototype `detail-card`.

- [ ] **Step 3: Implement reference preview dialog**

Create `frontend/src/components/ReferenceImageDialog.tsx`:

```tsx
import type { Workspace } from '../lib/types';

type Props = {
  workspace: Workspace;
  onClose: () => void;
};

export function ReferenceImageDialog({ workspace, onClose }: Props) {
  if (!workspace.referenceImagePath) {
    return null;
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <section className="detail-card" role="dialog" aria-modal="true" aria-label="参考图预览" onClick={(event) => event.stopPropagation()}>
        <div className="detail-image-wrap">
          <img src={workspace.referenceImagePath} alt="" className="detail-image" />
        </div>
        <div className="detail-body">
          <h2>参考图</h2>
          <dl className="detail-list">
            <dt>文件</dt>
            <dd>{workspace.referenceImageName ?? '参考图'}</dd>
            <dt>用途</dt>
            <dd>作为本次生成的视觉参考图。</dd>
          </dl>
          <button className="quiet-button" type="button" onClick={onClose}>关闭</button>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Upgrade result detail dialog**

Modify `frontend/src/components/ResultDetailDialog.tsx`:

```tsx
import { formatDateTime } from '../lib/format';
import type { HistoryItem } from '../lib/types';

type Props = {
  item: HistoryItem | null;
  paletteName?: string;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
};
```

Use `detail-card`, `detail-image-wrap`, and `detail-body` markup. Render:

```tsx
<dt>时间</dt>
<dd>{formatDateTime(item.createdAt)}</dd>
```

Render palette with:

```tsx
<dd>{paletteName ?? item.colorSchemeId}</dd>
```

- [ ] **Step 5: Wire reference preview into GeneratePage**

In `frontend/src/components/GeneratePage.tsx`:

```tsx
const [referenceOpen, setReferenceOpen] = useState(false);
```

When a reference exists, render:

```tsx
<button className="reference-card" type="button" onClick={() => setReferenceOpen(true)}>
  <img src={props.workspace.referenceImagePath} alt="" />
  <span>
    <strong>参考图</strong>
    <span className="label">{props.workspace.referenceImageName ?? '已上传'}</span>
  </span>
</button>
```

At the bottom of the component:

```tsx
<ReferenceImageDialog workspace={props.workspace} onClose={() => setReferenceOpen(false)} />
```

- [ ] **Step 6: Run dialog and generate tests**

Run:

```bash
npm run test -w frontend -- result-detail-dialog.test.tsx generate-page.test.tsx
```

Expected:

- Both tests pass.

---

## Task 5: Rebuild History Page To Prototype Table

**Files:**
- Modify: `frontend/src/components/HistoryPage.tsx`
- Modify: `frontend/test/history-page.test.tsx`

- [ ] **Step 1: Update history page props and test**

Modify `frontend/test/history-page.test.tsx` to pass palettes:

```tsx
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
```

Update render:

```tsx
<HistoryPage
  items={[item]}
  palettes={palettes}
  query=""
  onQueryChange={() => {}}
  onSearch={async () => {}}
  onReuse={() => {}}
  onDelete={async () => {}}
/>
```

Add assertions:

```ts
expect(html).toContain('共 1 张历史图片');
expect(html).toContain('点击缩略图查看详情');
expect(html).toContain('Okabe-Ito');
expect(html).toContain('class="history-thumb-button"');
expect(html).toContain('class="panel history-panel"');
```

- [ ] **Step 2: Run history test to verify it fails**

Run:

```bash
npm run test -w frontend -- history-page.test.tsx
```

Expected:

- Test fails because `HistoryPage` does not accept palettes and lacks prototype classes.

- [ ] **Step 3: Implement history page prototype structure**

Modify `frontend/src/components/HistoryPage.tsx` props:

```tsx
import { useState } from 'react';
import { getPaletteLabel } from '../lib/format';
import type { ColorScheme, HistoryItem, Workspace } from '../lib/types';
import { ResultDetailDialog } from './ResultDetailDialog';

type Props = {
  items: HistoryItem[];
  palettes: ColorScheme[];
  query: string;
  onQueryChange: (query: string) => void;
  onSearch: () => Promise<void>;
  onReuse: (workspacePatch: Partial<Workspace>) => void;
  onDelete: (id: string) => Promise<void>;
};
```

Add local selected state:

```tsx
const [selected, setSelected] = useState<HistoryItem | null>(null);
```

Use prototype structure:

```tsx
<section className="history-page">
  <div className="history-toolbar">
    <form className="search-form" ...>...</form>
    <span className="subtle">共 {items.length} 张历史图片</span>
  </div>
  <section className="panel history-panel">
    <div className="section-head">
      <h1>历史</h1>
      <span>点击缩略图查看详情，或带回生成页继续编辑</span>
    </div>
    <div className="table-scroll">...</div>
  </section>
  <ResultDetailDialog
    item={selected}
    paletteName={selected ? getPaletteLabel(palettes, selected.colorSchemeId) : undefined}
    onClose={() => setSelected(null)}
    onDelete={async (id) => {
      await onDelete(id);
      setSelected(null);
    }}
  />
</section>
```

Render image cell:

```tsx
<button className="history-thumb-button" type="button" onClick={() => setSelected(item)}>
  {item.previewUrl ? <img className="history-thumb" src={item.previewUrl} alt="" /> : <span>无预览</span>}
</button>
```

Render palette label:

```tsx
<td>{getPaletteLabel(palettes, item.colorSchemeId)}</td>
```

- [ ] **Step 4: Run history test**

Run:

```bash
npm run test -w frontend -- history-page.test.tsx
```

Expected:

- `history-page.test.tsx` passes.

---

## Task 6: Rebuild Palettes Page To Prototype Split Editor

**Files:**
- Modify: `frontend/src/components/PalettesPage.tsx`
- Modify: `frontend/test/palettes-page.test.tsx`

- [ ] **Step 1: Expand palettes test**

Modify `frontend/test/palettes-page.test.tsx` assertions:

```ts
expect(html).toContain('class="palette-page split-page"');
expect(html).toContain('class="palette-card palette-card--active"');
expect(html).toContain('class="palette-hero"');
expect(html).toContain('class="palette-poster"');
expect(html).toContain('固定 8 个语义色槽');
expect(html).toContain('当前方案');
expect(html).toContain('palette-swatches');
```

- [ ] **Step 2: Run palettes test to verify it fails**

Run:

```bash
npm run test -w frontend -- palettes-page.test.tsx
```

Expected:

- Test fails because current markup has no palette cards, hero, poster, or swatches.

- [ ] **Step 3: Implement palette sidebar cards**

In `frontend/src/components/PalettesPage.tsx`, import swatches:

```tsx
import { PaletteSwatches } from './PaletteSwatches';
```

Render sidebar list with:

```tsx
<button
  key={palette.id}
  className={palette.id === selected.id ? 'palette-card palette-card--active' : 'palette-card'}
  type="button"
  onClick={() => props.onSelect(palette.id)}
>
  <strong>{palette.name}</strong>
  <span className="subtle">{palette.isPreset ? '预设' : '自定义'}{palette.isDefault ? ' / 默认' : ''}</span>
  <PaletteSwatches colors={palette.colors} className="palette-swatches--compact" label={`${palette.name} 配色`} />
</button>
```

- [ ] **Step 4: Implement palette hero and editor**

Above the editor content, render:

```tsx
<div className="section-head">
  <h1>编辑配色</h1>
  <span>固定 8 个语义色槽</span>
</div>
<div className="palette-hero">
  <div className="palette-poster" style={{
    background: `linear-gradient(135deg, ${colors.primary}, transparent 48%), linear-gradient(45deg, ${colors.secondary}, transparent 54%), ${colors.section_bg}`,
  }} />
  <div className="palette-notes">
    <div>
      <span className="label">当前方案</span>
      <h2>{selected.name}</h2>
      <span className="subtle">{selected.description || (selected.isPreset ? '预设配色' : '自定义配色')}</span>
    </div>
    <PaletteSwatches colors={colors} />
    <div className="button-row">...</div>
  </div>
</div>
```

Keep the fixed 8 slot editor using `PALETTE_SLOTS.map`.

- [ ] **Step 5: Preserve palette behavior**

Keep these current behavior rules:

- Presets cannot edit name or colors directly.
- Presets render `复制为自定义`.
- Custom palettes render `保存配色`.
- `设为默认` works for both preset and custom palettes.
- `删除` only appears for custom palettes.
- New palette still calls `props.onCreate('新配色', colors)`.

- [ ] **Step 6: Run palettes test**

Run:

```bash
npm run test -w frontend -- palettes-page.test.tsx
```

Expected:

- `palettes-page.test.tsx` passes.

---

## Task 7: Rebuild Settings Page To Prototype Split Layout

**Files:**
- Modify: `frontend/src/components/SettingsPage.tsx`
- Modify: `frontend/test/settings-page.test.tsx`

- [ ] **Step 1: Expand settings test**

Modify `frontend/test/settings-page.test.tsx` assertions:

```ts
expect(html).toContain('class="settings-page split-page split-page--settings"');
expect(html).toContain('连接状态');
expect(html).toContain('配置来源');
expect(html).toContain('后端本地存储');
expect(html).toContain('可见范围');
expect(html).toContain('仅本机');
expect(html).toContain('生产部署');
expect(html).toContain('Fastify 单服务');
```

- [ ] **Step 2: Run settings test to verify it fails**

Run:

```bash
npm run test -w frontend -- settings-page.test.tsx
```

Expected:

- Test fails because current settings page has only a narrow form.

- [ ] **Step 3: Implement split settings layout**

Modify `frontend/src/components/SettingsPage.tsx`:

```tsx
<section className="settings-page split-page split-page--settings">
  <form className="panel settings-form" onSubmit={...}>
    <div className="section-head">
      <h1>设置</h1>
      <span>保存图片生成服务连接信息</span>
    </div>
    <div className="settings-form-body">
      ...
    </div>
  </form>

  <aside className="panel settings-status-card">
    <div className="section-head">
      <h2>连接状态</h2>
      <span>手动测试</span>
    </div>
    <div className="connection-card">
      <div className="connection-meter">
        <span className="label">当前状态</span>
        <strong>{status ?? '尚未测试'}</strong>
        <p className="subtle">配置更新时间：{settings.updatedAt || '尚未保存'}</p>
      </div>
      <div className="info-list">
        <div className="status-line"><span className="subtle">配置来源</span><strong>后端本地存储</strong></div>
        <div className="status-line"><span className="subtle">可见范围</span><strong>仅本机</strong></div>
        <div className="status-line"><span className="subtle">生产部署</span><strong>Fastify 单服务</strong></div>
      </div>
    </div>
  </aside>
</section>
```

- [ ] **Step 4: Preserve settings behavior**

Keep:

- Full API Key remains visible in the input.
- Save calls `onSave`.
- Test connection calls `onTestConnection`.
- Base URL and API Key changes call `onSettingsChange`.

- [ ] **Step 5: Run settings test**

Run:

```bash
npm run test -w frontend -- settings-page.test.tsx
```

Expected:

- `settings-page.test.tsx` passes.

---

## Task 8: Replace CSS With Prototype Gallery Style

**Files:**
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Replace global tokens and base shell styles**

In `frontend/src/styles.css`, replace the current warm tokens with:

```css
:root {
  --paper: #f7f8fa;
  --surface: #ffffff;
  --surface-soft: #fbfcfd;
  --ink: #17191b;
  --muted: #707780;
  --faint: #a5adb5;
  --line: #dde2e7;
  --line-strong: #cbd3da;
  --selected: #edf2f5;
  --selected-line: #d2dbe2;
  --accent: #2f3842;
  --accent-hover: #232b34;
  --danger: #8f3d3d;
  --warning: #7b6a3f;
  --radius: 5px;
  --shadow-panel: 0 8px 22px rgba(22, 30, 38, 0.045);
  --shadow-gallery: 0 20px 68px rgba(22, 30, 38, 0.12), 0 1px 0 rgba(255, 255, 255, 0.88) inset;
  --shadow-soft: 0 8px 22px rgba(22, 30, 38, 0.055), 0 1px 0 rgba(255, 255, 255, 0.82) inset;
  color: var(--ink);
  background: var(--paper);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans SC", "Noto Sans", Arial, sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}
```

- [ ] **Step 2: Implement cold background and compact glass nav**

Add these shell styles:

```css
body {
  position: relative;
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  background: var(--paper);
}

body::before,
body::after {
  content: "";
  position: fixed;
  z-index: -1;
  border-radius: 999px;
  filter: blur(34px);
  opacity: 0.28;
  pointer-events: none;
}

body::before {
  width: 420px;
  height: 220px;
  right: 7vw;
  top: 94px;
  background: rgba(218, 225, 232, 0.82);
}

body::after {
  width: 360px;
  height: 180px;
  left: 8vw;
  bottom: 110px;
  background: rgba(226, 232, 238, 0.72);
}

.app-shell {
  width: min(1280px, calc(100vw - 48px));
  min-height: 100vh;
  margin: 0 auto;
  padding: 18px 0 36px;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  border-bottom: 1px solid var(--line);
  padding-bottom: 8px;
  animation: rise-in 420ms ease both;
}

.brand-button {
  border: 0;
  background: transparent;
  color: var(--ink);
  padding: 0;
}

.brand-mark {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--ink);
  font-weight: 680;
  letter-spacing: -0.02em;
}

.brand-logo {
  width: 26px;
  height: 26px;
  display: block;
}

.topnav--glass {
  display: inline-flex;
  gap: 4px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.58);
  box-shadow: var(--shadow-soft);
  padding: 3px;
  backdrop-filter: blur(22px) saturate(1.18);
}
```

- [ ] **Step 3: Implement form, panel, and button styles**

Include styles for:

- `.panel`
- `.gallery-panel`
- `.section-head`
- `.label`
- `.label--strong`
- `.field`
- `.prompt-input`
- `.control-grid`
- `.primary-button`
- `.quiet-button`
- `.danger-text`
- `.inline-hint`

Use prototype values:

```css
.panel {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow-panel);
  overflow: hidden;
}

.primary-button {
  border: 1px solid var(--accent);
  border-radius: var(--radius);
  background: linear-gradient(180deg, #3d4650, var(--accent));
  color: #fff;
  font-weight: 620;
  min-height: 38px;
  padding: 0 14px;
  box-shadow: 0 8px 18px rgba(47, 56, 66, 0.18);
}
```

- [ ] **Step 4: Implement generate and gallery styles**

Include styles for:

- `.generate-layout`
- `.panel--input`
- `.panel--preview`
- `.palette-preview-row`
- `.palette-swatches`
- `.reference-card`
- `.latest-frame`
- `.latest-image`
- `.recent-gallery`
- `.gallery-strip`
- `.gallery-thumb`
- `.gallery-thumb img`
- `.gallery-thumb:hover img`

Critical gallery rules:

```css
.gallery-strip {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(164px, 1fr);
  gap: 12px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x proximity;
  padding: 2px 2px 14px;
}

.gallery-thumb {
  border: 0;
  border-radius: var(--radius);
  background: transparent;
  padding: 0;
  scroll-snap-align: start;
}

.gallery-thumb img {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: var(--radius);
  object-fit: cover;
  transform-origin: bottom center;
  transition: transform 180ms ease, box-shadow 180ms ease;
}

.gallery-thumb:hover img {
  transform: perspective(700px) rotateX(2.4deg) translateY(-1px);
  box-shadow: 0 14px 24px rgba(22, 30, 38, 0.18);
}
```

- [ ] **Step 5: Implement history, palette, settings, and dialog styles**

Include styles for:

- `.history-toolbar`
- `.history-panel`
- `.table-scroll`
- `.history-table`
- `.history-thumb-button`
- `.history-thumb`
- `.split-page`
- `.palette-list`
- `.palette-card`
- `.palette-card--active`
- `.palette-hero`
- `.palette-poster`
- `.palette-notes`
- `.color-slot-grid`
- `.color-slot`
- `.settings-form-body`
- `.settings-status-card`
- `.connection-card`
- `.connection-meter`
- `.info-list`
- `.status-line`
- `.dialog-backdrop`
- `.detail-card`
- `.detail-image-wrap`
- `.detail-image`
- `.detail-body`
- `.detail-list`

- [ ] **Step 6: Implement animations and responsive behavior**

Add:

```css
@keyframes rise-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 1ms !important;
    transition-duration: 1ms !important;
  }
}

@media (max-width: 940px) {
  .generate-layout,
  .split-page {
    grid-template-columns: 1fr;
  }

  .panel--input,
  .panel--preview {
    min-height: auto;
  }
}

@media (max-width: 640px) {
  .app-shell {
    width: min(100vw - 28px, 1280px);
    padding-top: 16px;
  }

  .topbar {
    align-items: stretch;
    flex-direction: column;
  }

  .topnav {
    overflow-x: auto;
  }

  .control-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 7: Run CSS contract test**

Run:

```bash
npm run test -w frontend -- style-contract.test.ts
```

Expected:

- `style-contract.test.ts` passes.

---

## Task 9: Full Verification

**Files:**
- Modify only if verification exposes a concrete failure.

- [ ] **Step 1: Run frontend tests**

Run:

```bash
npm run test -w frontend
```

Expected:

- All frontend test files pass.

- [ ] **Step 2: Run backend tests**

Run:

```bash
npm run test -w backend
```

Expected:

- All backend test files pass.

- [ ] **Step 3: Run full workspace tests**

Run:

```bash
npm run test
```

Expected:

- Backend and frontend tests pass in one command.

- [ ] **Step 4: Run production build**

Run:

```bash
npm run build
```

Expected:

- Backend TypeScript build passes.
- Frontend TypeScript build passes.
- Vite production build emits `frontend/dist`.

- [ ] **Step 5: Manual browser check**

Run:

```bash
npm run dev
```

Open the Vite URL printed by the frontend. Check these flows:

- Generate page uses cold white background, compact glass nav, equal-height left/right panels on desktop.
- Prompt label reads `描述你需要的图片`.
- Missing baseURL/API Key hint appears only near the generate button.
- Bottom gallery shows no more than 12 items and scrolls horizontally with mouse wheel when overflowing.
- Hovering a gallery image lifts the image with shadow; there is no visible image wrapper border.
- Clicking a recent image opens detail with prompt, size, quality, palette, time, download, delete.
- Reference image upload shows a thumbnail; clicking it opens a preview.
- History page uses search toolbar and table panel.
- Palette page uses sidebar cards and hero editor with fixed 8 slots.
- Settings page uses form plus connection/status card.
- Mobile width stacks panels without horizontal page overflow except inside intentional table/gallery scroll areas.

- [ ] **Step 6: Check git diff**

Run:

```bash
git status --short
git diff -- frontend/src frontend/test
```

Expected:

- Diff contains only frontend implementation/test changes from this plan.
- No backend files changed unless a previous step added a failing backend test and necessary implementation.
- Do not commit unless the user explicitly authorizes it.

---

## Self-Review

### Spec Coverage

- Current project frontend is rebuilt from the committed prototypes: Tasks 2, 3, 5, 6, 7, 8.
- Generate page left/right split and bottom gallery: Task 3 and Task 8.
- Gallery horizontal wheel with damping: Task 1 and Task 3.
- Gallery image hover lift/shadow and no wrapper border: Task 8.
- Result detail prompt/size/quality/palette/time/download/delete: Task 4.
- Reference image thumbnail and preview: Task 4.
- History page table-first layout: Task 5.
- Palette page polished split editor: Task 6.
- Settings page polished split layout: Task 7.
- Backend remains stable unless proven necessary: File Structure and Task 9.

### Placeholder Scan

This plan contains no unresolved placeholder markers or unowned implementation areas. Each task lists exact files, exact tests, exact commands, and concrete JSX/CSS/TypeScript snippets.

### Type Consistency

- `HistoryPage` gains `palettes: ColorScheme[]`, and `App.tsx` passes existing `palettes`.
- `ResultDetailDialog` gains optional `paletteName?: string`, preserving existing callers that do not need a label.
- `PaletteSwatches` uses existing `PaletteColors` and `PALETTE_SLOTS`.
- `horizontalScroll.ts` exports both pure helper and hook; tests cover the pure helper.

### Commit Policy

The general superpowers plan template recommends frequent commits, but this repository's `AGENTS.md` explicitly says not to commit without user consent. Therefore this plan intentionally omits commit steps. If the user authorizes commits later, commit after each completed task with the exact files from that task.
