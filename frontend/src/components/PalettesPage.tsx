import { useEffect, useState } from 'react';

import { PALETTE_SLOTS } from '../lib/paletteSlots';
import type { ColorScheme, PaletteColors } from '../lib/types';

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
        <div className="section-heading">
          <h1>配色</h1>
          <button className="quiet-button" type="button" onClick={() => void props.onCreate('新配色', colors)}>新建</button>
        </div>
        {props.palettes.map((palette) => (
          <button key={palette.id} className={palette.id === selected.id ? 'list-row list-row--active' : 'list-row'} type="button" onClick={() => props.onSelect(palette.id)}>
            <span>{palette.name}</span>
            <small>{palette.isPreset ? '预设' : '自定义'}{palette.isDefault ? ' / 默认' : ''}</small>
          </button>
        ))}
      </aside>
      <form className="panel palette-editor" onSubmit={(event) => {
        event.preventDefault();
        if (!selected.isPreset) {
          void props.onSave(selected.id, name, colors);
        }
      }}>
        <label className="field field--stacked">
          <span>名称</span>
          <input value={name} disabled={selected.isPreset} onChange={(event) => setName(event.target.value)} />
        </label>
        <div className="color-slot-grid">
          {PALETTE_SLOTS.map((slot) => (
            <label className="color-slot" key={slot}>
              <span>{slot}</span>
              <input type="color" value={colors[slot]} disabled={selected.isPreset} onChange={(event) => setColors({ ...colors, [slot]: event.target.value })} />
              <input value={colors[slot]} disabled={selected.isPreset} onChange={(event) => setColors({ ...colors, [slot]: event.target.value })} />
            </label>
          ))}
        </div>
        <div className="button-row">
          {selected.isPreset ? (
            <button className="primary-button" type="button" onClick={() => void props.onCopy(selected.id, `${selected.name} Copy`)}>复制为自定义</button>
          ) : (
            <button className="primary-button" type="submit">保存配色</button>
          )}
          <button className="quiet-button" type="button" onClick={() => void props.onSetDefault(selected.id)}>设为默认</button>
          {!selected.isPreset ? <button className="quiet-button danger-text" type="button" onClick={() => void props.onDelete(selected.id)}>删除</button> : null}
        </div>
      </form>
    </section>
  );
}
