import { useEffect, useState, type ReactNode } from 'react';
import type { HexpickBridge, PluginSnapshot } from '../../shared/ipc';
import type { Settings } from '../../shared/settings';
import { getBridge } from '../common/bridge';
import { HotkeyRecorder } from './HotkeyRecorder';
import { PluginList } from './PluginList';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="section" aria-label={title}>
      <h2>{title}</h2>
      <div className="card">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="row">
      <div className="row__label">
        {label}
        {hint && <span className="hint">{hint}</span>}
      </div>
      <div className="row__control">{children}</div>
    </div>
  );
}

export function SettingsApp() {
  const [bridge, setBridge] = useState<HexpickBridge | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [snapshot, setSnapshot] = useState<PluginSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const unsubs: (() => void)[] = [];
    getBridge()
      .then(async (b) => {
        const [s, p] = await Promise.all([b.getSettings(), b.getPlugins()]);
        if (cancelled) return;
        setBridge(b);
        setSettings(s);
        setSnapshot(p);
        unsubs.push(b.onSettingsChanged(setSettings), b.onPluginsChanged(setSnapshot));
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
    };
  }, []);

  if (error) return <main className="page"><p className="hint is-error">设置加载失败：{error}</p></main>;
  if (!bridge || !settings || !snapshot) return <main className="page" aria-busy="true" />;

  return (
    <main className="page">
      <header className="titlebar">
        <h1>HexPick</h1>
        <p>海克斯大乱斗风格的随身抽卡</p>
      </header>

      <Section title="快捷键">
        <Row label="呼出 / 关闭浮层">
          <HotkeyRecorder bridge={bridge} value={settings.hotkey} />
        </Row>
      </Section>

      <Section title="声音">
        <Row label="静音" hint="浮层里按 M 也能切换">
          <label className="switch">
            <input type="checkbox" checked={settings.muted} onChange={(e) => void bridge.setSettings({ muted: e.target.checked })} />
            <span />
          </label>
        </Row>
        <Row label="音量">
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.volume}
            disabled={settings.muted}
            aria-label="音量"
            onChange={(e) => void bridge.setSettings({ volume: Number(e.target.value) })}
          />
        </Row>
      </Section>

      <Section title="通用">
        <Row label="开机时启动">
          <label className="switch">
            <input type="checkbox" checked={settings.launchAtLogin} onChange={(e) => void bridge.setSettings({ launchAtLogin: e.target.checked })} />
            <span />
          </label>
        </Row>
      </Section>

      <Section title="插件">
        <PluginList bridge={bridge} snapshot={snapshot} settings={settings} />
      </Section>

      <footer className="footnote">
        卡片、背景与特效素材来自《英雄联盟》，版权归 Riot Games 所有。HexPick 是非商业粉丝工具，与 Riot Games 无关。
      </footer>
    </main>
  );
}
