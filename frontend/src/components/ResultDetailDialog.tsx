import { useEffect, useState } from 'react';

import { formatDateTime } from '../lib/format';
import { getHistoryErrorMessage } from '../lib/history';
import type { HistoryItem } from '../lib/types';
import { FullscreenImageDialog } from './FullscreenImageDialog';

type Props = {
  item: HistoryItem | null;
  paletteName?: string;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
};

export function ResultDetailDialog({ item, paletteName, onClose, onDelete }: Props) {
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);
  const [fullscreenImageUrl, setFullscreenImageUrl] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  useEffect(() => {
    if (!item) {
      setFullscreenImageUrl(null);
      return;
    }

    setIsPromptExpanded(false);
    setFullscreenImageUrl(null);
    setCopyState('idle');
  }, [item?.id]);

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

  const errorMessage = getHistoryErrorMessage(item);
  const copyPrompt = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(item.prompt);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = item.prompt;
        textarea.setAttribute('readonly', 'true');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  };

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <section className="detail-card" role="dialog" aria-modal="true" aria-label="生成详情" onClick={(event) => event.stopPropagation()}>
        <div className={item.previewUrl ? 'detail-image-wrap' : 'detail-image-wrap detail-image-wrap--empty'}>
          {item.previewUrl ? (
            <button className="detail-image-button" type="button" aria-label="全屏查看生成图片" onClick={() => setFullscreenImageUrl(item.previewUrl)}>
              <img src={item.previewUrl} alt="" className="detail-image" />
            </button>
          ) : (
            <p className="empty-state">{item.status === 'failed' ? '生成失败' : '无预览'}</p>
          )}
        </div>
        <div className="detail-body">
          <h2>生成详情</h2>
          <dl className="detail-list">
            <dt>Prompt</dt>
            <dd className="detail-prompt-cell">
              <div className={isPromptExpanded ? 'detail-prompt detail-prompt--expanded' : 'detail-prompt'}>
                <button className="detail-prompt-copy" type="button" aria-label="复制 Prompt" onClick={() => void copyPrompt()}>
                  <span className="detail-prompt-text">{item.prompt}</span>
                </button>
                <button
                  className={isPromptExpanded ? 'detail-prompt-toggle detail-prompt--expanded' : 'detail-prompt-toggle'}
                  type="button"
                  aria-expanded={isPromptExpanded}
                  onClick={() => setIsPromptExpanded((current) => !current)}
                >
                  {copyState === 'copied' ? '已复制' : copyState === 'failed' ? '复制失败' : isPromptExpanded ? '点击收起' : '点击展开全部'}
                </button>
              </div>
            </dd>
            <dt>尺寸</dt>
            <dd>{item.size}</dd>
            <dt>质量</dt>
            <dd>{item.quality}</dd>
            <dt>配色</dt>
            <dd>{paletteName ?? item.colorSchemeId}</dd>
            <dt>时间</dt>
            <dd>{formatDateTime(item.createdAt)}</dd>
            {item.status === 'failed' ? (
              <>
                <dt>错误</dt>
                <dd>{errorMessage ?? '生成失败，但没有返回错误详情。'}</dd>
              </>
            ) : null}
          </dl>
          <div className="button-row">
            {item.previewUrl ? <a className="quiet-button" href={item.downloadUrl}>下载</a> : null}
            <button className="quiet-button danger-text" type="button" onClick={() => void onDelete(item.id)}>删除</button>
            <button className="quiet-button" type="button" aria-label="关闭生成详情" onClick={onClose}>关闭</button>
          </div>
        </div>
      </section>
      <FullscreenImageDialog imageUrl={fullscreenImageUrl} label="全屏查看生成图片" onClose={() => setFullscreenImageUrl(null)} />
    </div>
  );
}
