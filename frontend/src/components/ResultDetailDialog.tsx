import { useEffect } from 'react';

import { formatDateTime } from '../lib/format';
import type { HistoryItem } from '../lib/types';

type Props = {
  item: HistoryItem | null;
  paletteName?: string;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
};

export function ResultDetailDialog({ item, paletteName, onClose, onDelete }: Props) {
  useEffect(() => {
    if (!item) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [item, onClose]);

  if (!item) {
    return null;
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <section className="detail-card" role="dialog" aria-modal="true" aria-label="生成详情" onClick={(event) => event.stopPropagation()}>
        <div className="detail-image-wrap">
          {item.previewUrl ? <img src={item.previewUrl} alt="" className="detail-image" /> : <p className="empty-state">无预览</p>}
        </div>
        <div className="detail-body">
          <h2>生成详情</h2>
          <dl className="detail-list">
            <dt>Prompt</dt>
            <dd>{item.prompt}</dd>
            <dt>尺寸</dt>
            <dd>{item.size}</dd>
            <dt>质量</dt>
            <dd>{item.quality}</dd>
            <dt>配色</dt>
            <dd>{paletteName ?? item.colorSchemeId}</dd>
            <dt>时间</dt>
            <dd>{formatDateTime(item.createdAt)}</dd>
          </dl>
          <div className="button-row">
            <a className="quiet-button" href={item.downloadUrl}>下载</a>
            <button className="quiet-button danger-text" type="button" onClick={() => void onDelete(item.id)}>删除</button>
            <button className="quiet-button" type="button" aria-label="关闭生成详情" onClick={onClose}>关闭</button>
          </div>
        </div>
      </section>
    </div>
  );
}
