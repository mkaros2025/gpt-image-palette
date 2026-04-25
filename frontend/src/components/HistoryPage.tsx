import { useState } from 'react';

import { formatDateTime, getPaletteLabel } from '../lib/format';
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

export function HistoryPage({ items, palettes, query, onQueryChange, onSearch, onReuse, onDelete }: Props) {
  const [selected, setSelected] = useState<HistoryItem | null>(null);

  return (
    <section className="history-page">
      <div className="history-toolbar">
        <form className="search-form" onSubmit={(event) => {
          event.preventDefault();
          void onSearch();
        }}>
          <input value={query} placeholder="搜索 prompt" onChange={(event) => onQueryChange(event.target.value)} />
          <button className="quiet-button" type="submit">搜索</button>
        </form>
        <span className="subtle">共 {items.length} 张历史图片</span>
      </div>
      <section className="panel history-panel">
        <div className="section-head">
          <h1>历史</h1>
          <span>点击缩略图查看详情，或带回生成页继续编辑</span>
        </div>
        {items.length ? (
          <div className="table-scroll">
            <table className="history-table">
              <thead>
                <tr>
                  <th>图片</th>
                  <th>Prompt</th>
                  <th>尺寸</th>
                  <th>质量</th>
                  <th>配色</th>
                  <th>时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <button
                        className="history-thumb-button"
                        type="button"
                        aria-label={`查看 ${item.prompt} 的生成详情`}
                        onClick={() => setSelected(item)}
                      >
                        {item.previewUrl ? <img className="history-thumb" src={item.previewUrl} alt="" /> : <span>无预览</span>}
                      </button>
                    </td>
                    <td className="prompt-cell">{item.prompt}</td>
                    <td>{item.size}</td>
                    <td>{item.quality}</td>
                    <td>{getPaletteLabel(palettes, item.colorSchemeId)}</td>
                    <td>{formatDateTime(item.createdAt)}</td>
                    <td>
                      <div className="table-actions">
                        <button className="quiet-button row-primary-action" type="button" onClick={() => onReuse({
                          prompt: item.prompt,
                          size: item.size,
                          quality: item.quality,
                          colorSchemeId: item.colorSchemeId,
                          customColors: item.customColors,
                        })}>带回生成页</button>
                        <a className="table-icon-action" href={item.downloadUrl} aria-label={`下载 ${item.prompt}`}>下载</a>
                        <button className="table-icon-action table-icon-action--danger" type="button" aria-label={`删除 ${item.prompt}`} onClick={() => void onDelete(item.id)}>删除</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="history-empty-state">
            <strong>还没有历史图片</strong>
            <span>生成图片后会出现在这里。你可以在生成页底部查看最近结果，在这里查看完整历史。</span>
          </div>
        )}
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
  );
}
