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
    expect(css).toContain('.settings-form');
  });

  it('contains the studio shell classes for the generate workspace', () => {
    expect(css).toContain('.generation-workbench');
    expect(css).toContain('grid-template-columns: 380px minmax(0, 1fr)');
    expect(css).toContain('align-items: stretch;');
    expect(css).toContain('.generation-sidebar');
    expect(css).toContain('.generation-preview');
    expect(css).toContain('.generation-workbench,\n.generation-sidebar,\n.generation-preview {\n  height: 650px;');
    expect(css).toContain('.preview-frame');
    expect(css).toContain('.preview-frame {\n  min-height: 0;\n  height: 100%;\n  display: grid;\n  place-items: center;');
    expect(css).toContain('.preview-image-surface {\n  display: block;\n  width: 100%;\n  height: 100%;');
    expect(css).toContain('background-position: center;');
    expect(css).toContain('background-repeat: no-repeat;');
    expect(css).toContain('background-size: contain;');
    expect(css).toContain('.fullscreen-image-surface {\n  width: 100%;\n  height: 100%;');
    expect(css).toContain('.fullscreen-image-surface {\n  width: 100%;\n  height: 100%;\n  border-radius: var(--radius);\n  background-position: center;\n  background-repeat: no-repeat;\n  background-size: contain;');
    expect(css).not.toContain('.canvas-empty-state--failed');
    expect(css).toContain('.preview-meta');
    expect(css).toContain('.preview-meta div {\n  display: flex;\n  align-items: center;\n  gap: 8px;');
    expect(css).toContain('.task-status');
    expect(css).toContain('.task-meter');
    expect(css).toContain('.recent-results');
    expect(css).toContain('.recent-results {\n  height: 162px;');
    expect(css).toContain('.recent-strip {\n  height: 104px;');
  });

  it('keeps the generate button aligned to the right and not bold', () => {
    expect(css).toContain('.generate-actions {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr) auto;');
    expect(css).toContain('.generate-notices {\n  display: grid;\n  gap: 6px;');
    expect(css).toContain('.generate-actions .primary-button {\n  justify-self: end;');
    expect(css).toContain('.primary-button {\n  border: 1px solid var(--accent);\n  background: var(--accent);\n  color: #fff;\n  font-weight: 500;');
  });

  it('keeps the workbench quiet without decorative background or CTA gradients', () => {
    expect(css).not.toContain('body::before');
    expect(css).not.toContain('body::after');
    expect(css).not.toContain('.primary-button {\n  border: 1px solid var(--accent);\n  background: linear-gradient');
    expect(css).not.toContain('.primary-button:hover:not(:disabled) {\n  background: linear-gradient');
    expect(css).toContain('.sidebar-divider');
    expect(css).toContain('.table-icon-action');
    expect(css).toContain('.palette-actions-card {\n  display: flex;');
  });

  it('adds restrained motion to the prompt template library', () => {
    expect(css).toContain('@keyframes template-layer-in');
    expect(css).toContain('@keyframes template-popover-in');
    expect(css).toContain('@keyframes template-card-in');
    expect(css).toContain('.prompt-template-popover {\n  width: min(560px, calc(100vw - 40px));');
    expect(css).toContain('animation: template-popover-in 180ms ease both');
    expect(css).toContain('.template-card:nth-child(2)');
  });

  it('keeps the palette preview label on one line', () => {
    expect(css).toContain('.palette-preview-row .label {\n  flex: 0 0 auto;\n  white-space: nowrap;');
  });

  it('keeps history rows fixed height with truncated prompts', () => {
    expect(css).toContain('.history-table {\n  width: 100%;\n  min-width: 900px;\n  table-layout: fixed;');
    expect(css).toContain('.history-table tbody tr {\n  height: 84px;');
    expect(css).toContain('.prompt-cell {\n  white-space: nowrap;\n  text-overflow: ellipsis;');
  });

  it('keeps the detail dialog compact when previews are missing', () => {
    expect(css).toContain('.detail-card {\n  width: min(860px, 100%);\n  max-height: calc(100vh - 56px);\n  display: grid;\n  grid-template-columns: minmax(280px, 1fr) minmax(260px, 0.75fr);\n  align-items: start;');
    expect(css).toContain('.detail-image-wrap {\n  display: grid;\n  place-items: center;\n  align-self: start;\n  min-height: 280px;');
  });
});
