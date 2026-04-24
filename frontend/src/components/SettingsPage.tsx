import type { Settings } from '../lib/types';

type Props = {
  settings: Settings;
  status: string | null;
  onSettingsChange: (next: Settings) => void;
  onSave: () => Promise<void>;
  onTestConnection: () => Promise<void>;
};

export function SettingsPage({ settings, status, onSettingsChange, onSave, onTestConnection }: Props) {
  return (
    <section className="settings-page narrow-page">
      <div className="section-heading">
        <h1>设置</h1>
      </div>
      <form className="panel settings-form" onSubmit={(event) => {
        event.preventDefault();
        void onSave();
      }}>
        <label className="field field--stacked">
          <span>baseURL</span>
          <input value={settings.baseUrl} onChange={(event) => onSettingsChange({ ...settings, baseUrl: event.target.value })} />
        </label>
        <label className="field field--stacked">
          <span>API Key</span>
          <input value={settings.apiKey} onChange={(event) => onSettingsChange({ ...settings, apiKey: event.target.value })} />
        </label>
        {status ? <p className="inline-status">{status}</p> : null}
        <div className="button-row">
          <button className="primary-button" type="submit">保存</button>
          <button className="quiet-button" type="button" onClick={() => void onTestConnection()}>测试连接</button>
        </div>
      </form>
    </section>
  );
}
