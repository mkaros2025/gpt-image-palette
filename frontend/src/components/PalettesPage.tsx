import { useEffect, useState } from 'react';

import { PALETTE_SLOTS } from '../lib/paletteSlots';
import type { ColorScheme, PaletteColors } from '../lib/types';
import { PaletteSwatches } from './PaletteSwatches';

const SLOT_LABELS: Record<(typeof PALETTE_SLOTS)[number], string> = {
  primary: '主色',
  secondary: '辅助色',
  tertiary: '强调色',
  text: '文字',
  fill: '填充',
  section_bg: '背景',
  border: '边界',
  arrow: '箭头',
};

type Props = {
  palettes: ColorScheme[];
  selectedId: string;
  onSelect: (id: string) => void;
  onCreate: (name: string, colors: PaletteColors) => Promise<void>;
  onCopy: (id: string, name: string) => Promise<void>;
  onSave: (id: string, name: string, colors: PaletteColors) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSetDefault: (id: string) => Promise<void>;
};

export function PalettesPage(props: Props) {
  const selected = props.palettes.find((palette) => palette.id === props.selectedId) ?? props.palettes[0] ?? null;
  const [name, setName] = useState(selected?.name ?? '');
  const [colors, setColors] = useState<PaletteColors | null>(selected?.colors ?? null);

  useEffect(() => {
    setName(selected?.name ?? '');
    setColors(selected?.colors ?? null);
  }, [selected?.id, selected?.name, selected?.colors]);

  if (!selected || !colors) {
    return <p className="empty-state">暂无配色</p>;
  }

  return (
    <section className="palette-page split-page">
      <aside className="panel palette-list">
        <div className="section-head">
          <h1>配色</h1>
          <button className="quiet-button" type="button" onClick={() => void props.onCreate('新配色', colors)}>新建</button>
        </div>
        {props.palettes.map((palette) => (
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
        ))}
      </aside>
      <form className="panel palette-editor" onSubmit={(event) => {
        event.preventDefault();
        if (!selected.isPreset) {
          void props.onSave(selected.id, name, colors);
        }
      }}>
        <div className="section-head">
          <h1>编辑配色</h1>
          <span>{selected.isPreset ? '预设只读，可复制后编辑' : '自定义方案'}</span>
        </div>
        <div className="palette-workbench">
          <div className="palette-hero">
            <div
              className="palette-poster"
              style={{
                background: `linear-gradient(135deg, ${colors.primary}, transparent 48%), linear-gradient(45deg, ${colors.secondary}, transparent 54%), ${colors.section_bg}`,
              }}
              aria-hidden="true"
            />
            <div className="palette-summary-card">
              <span className="label">当前方案</span>
              {selected.isPreset ? (
                <h2>{selected.name}</h2>
              ) : (
                <input
                  className="palette-title-input"
                  aria-label="配色名称"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              )}
              <span className="subtle">{selected.description || (selected.isPreset ? '预设配色' : '自定义配色')}</span>
              <PaletteSwatches colors={colors} />
              <div className="palette-actions-card" aria-label="配色操作">
                {selected.isPreset ? (
                  <button className="primary-button" type="button" onClick={() => void props.onCopy(selected.id, `${selected.name} Copy`)}>复制为自定义</button>
                ) : (
                  <button className="primary-button" type="submit">保存配色</button>
                )}
                <button className="quiet-button" type="button" onClick={() => void props.onSetDefault(selected.id)}>设为默认</button>
                {!selected.isPreset ? <button className="quiet-button danger-text" type="button" onClick={() => void props.onDelete(selected.id)}>删除</button> : null}
              </div>
            </div>
          </div>
        </div>
        <div className="palette-editor-body">
          <div className="color-slot-list">
            {PALETTE_SLOTS.map((slot) => (
              <label className="color-slot" key={slot}>
                <span className="color-slot-name">
                  <strong>{SLOT_LABELS[slot]}</strong>
                  <em>{slot}</em>
                </span>
                <input type="color" value={colors[slot]} disabled={selected.isPreset} onChange={(event) => setColors({ ...colors, [slot]: event.target.value })} />
                <input value={colors[slot]} disabled={selected.isPreset} onChange={(event) => setColors({ ...colors, [slot]: event.target.value })} />
              </label>
            ))}
          </div>
        </div>
      </form>
    </section>
  );
}
