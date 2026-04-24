import type { HistoryItem, Workspace } from '../lib/types';

type Props = {
  items: HistoryItem[];
  query: string;
  onQueryChange: (query: string) => void;
  onSearch: () => Promise<void>;
  onReuse: (workspacePatch: Partial<Workspace>) => void;
  onDelete: (id: string) => Promise<void>;
};

export function HistoryPage({ items, query, onQueryChange, onSearch, onReuse, onDelete }: Props) {
  return (
    <section className="history-page">
      <div className="section-heading">
        <h1>历史</h1>
        <form className="search-form" onSubmit={(event) => {
          event.preventDefault();
          void onSearch();
        }}>
          <input value={query} placeholder="搜索 prompt" onChange={(event) => onQueryChange(event.target.value)} />
          <button className="quiet-button" type="submit">搜索</button>
        </form>
      </div>
      <div className="history-table-wrap">
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
                <td>{item.previewUrl ? <img className="history-thumb" src={item.previewUrl} alt="" /> : null}</td>
                <td className="prompt-cell">{item.prompt}</td>
                <td>{item.size}</td>
                <td>{item.quality}</td>
                <td>{item.colorSchemeId}</td>
                <td>{new Date(item.createdAt).toLocaleString()}</td>
                <td>
                  <div className="table-actions">
                    <button className="quiet-button" type="button" onClick={() => onReuse({
                      prompt: item.prompt,
                      size: item.size,
                      quality: item.quality,
                      colorSchemeId: item.colorSchemeId,
                      customColors: item.customColors,
                    })}>带回生成页</button>
                    <a className="quiet-button" href={item.downloadUrl}>下载</a>
                    <button className="quiet-button danger-text" type="button" onClick={() => void onDelete(item.id)}>删除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 ? <p className="empty-state">暂无结果</p> : null}
      </div>
    </section>
  );
}
