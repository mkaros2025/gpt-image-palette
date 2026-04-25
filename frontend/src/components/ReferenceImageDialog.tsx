import { useEffect } from 'react';

import type { Workspace } from '../lib/types';

type Props = {
  workspace: Workspace;
  onClose: () => void;
};

export function ReferenceImageDialog({ workspace, onClose }: Props) {
  useEffect(() => {
    if (workspace.referenceImages.length === 0) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [workspace.referenceImages.length, onClose]);

  if (workspace.referenceImages.length === 0) {
    return null;
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <section className="detail-card reference-detail-card" role="dialog" aria-modal="true" aria-label="参考图预览" onClick={(event) => event.stopPropagation()}>
        <div className="reference-detail-grid">
          {workspace.referenceImages.map((image, index) => (
            <figure className="reference-detail-item" key={`${image.path}-${index}`}>
              <img src={image.path} alt="" className="detail-image" />
              <figcaption>{image.name ?? `参考图 ${index + 1}`}</figcaption>
            </figure>
          ))}
        </div>
        <div className="detail-body">
          <h2>参考图</h2>
          <dl className="detail-list">
            <dt>数量</dt>
            <dd>{workspace.referenceImages.length} 张</dd>
            <dt>用途</dt>
            <dd>这些图片会一起作为本次生成的视觉参考图。</dd>
          </dl>
          <button className="quiet-button" type="button" aria-label="关闭参考图预览" onClick={onClose}>关闭</button>
        </div>
      </section>
    </div>
  );
}
