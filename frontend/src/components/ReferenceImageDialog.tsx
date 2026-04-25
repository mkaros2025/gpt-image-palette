import { useEffect } from 'react';

import type { Workspace } from '../lib/types';

type Props = {
  workspace: Workspace;
  onClose: () => void;
};

export function ReferenceImageDialog({ workspace, onClose }: Props) {
  useEffect(() => {
    if (!workspace.referenceImagePath) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [workspace.referenceImagePath, onClose]);

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
          <button className="quiet-button" type="button" aria-label="关闭参考图预览" onClick={onClose}>关闭</button>
        </div>
      </section>
    </div>
  );
}
