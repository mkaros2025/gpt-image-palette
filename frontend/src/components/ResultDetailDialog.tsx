import type { HistoryItem } from '../lib/types';

type Props = {
  item: HistoryItem | null;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
};

export function ResultDetailDialog({ item, onClose, onDelete }: Props) {
  if (!item) {
    return null;
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <section className="result-dialog" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        {item.previewUrl ? <img src={item.previewUrl} alt="" className="result-dialog__image" /> : null}
        <div className="result-dialog__body">
          <h2>生成详情</h2>
          <dl className="detail-list">
            <dt>Prompt</dt>
            <dd>{item.prompt}</dd>
            <dt>尺寸</dt>
            <dd>{item.size}</dd>
            <dt>质量</dt>
            <dd>{item.quality}</dd>
            <dt>配色</dt>
            <dd>{item.colorSchemeId}</dd>
          </dl>
          <div className="button-row">
            <a className="quiet-button" href={item.downloadUrl}>下载</a>
            <button className="quiet-button danger-text" type="button" onClick={() => void onDelete(item.id)}>删除</button>
            <button className="quiet-button" type="button" onClick={onClose}>关闭</button>
          </div>
        </div>
      </section>
    </div>
  );
}
