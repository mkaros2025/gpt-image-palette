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
    expect(css).toContain('.generate-studio');
    expect(css).toContain('grid-template-columns: minmax(340px, 380px) minmax(0, 1fr)');
    expect(css).toContain('.studio-composer');
    expect(css).toContain('.studio-canvas');
    expect(css).toContain('.canvas-stage');
    expect(css).toContain('.canvas-meta-bar');
    expect(css).toContain('.studio-filmstrip');
  });

  it('keeps the workbench quiet without decorative background or CTA gradients', () => {
    expect(css).not.toContain('body::before');
    expect(css).not.toContain('body::after');
    expect(css).not.toContain('.primary-button {\n  border: 1px solid var(--accent);\n  background: linear-gradient');
    expect(css).not.toContain('.primary-button:hover:not(:disabled) {\n  background: linear-gradient');
    expect(css).toContain('.generate-compact-surface');
    expect(css).toContain('.table-icon-action');
    expect(css).toContain('.palette-actions-card {\n  display: flex;');
  });
});
