import { useEffect, useMemo, useState } from 'react';
import type { HexpickBridge, LoadedPlugin, PluginSnapshot } from '../../shared/ipc';
import type { Settings } from '../../shared/settings';
import { getBridge } from '../common/bridge';

export interface OverlayData {
  readonly bridge: HexpickBridge | null;
  readonly snapshot: PluginSnapshot | null;
  readonly settings: Settings | null;
  readonly plugins: readonly LoadedPlugin[];
  readonly active: LoadedPlugin | null;
  readonly loadError: string | null;
}

export function useOverlayData(): OverlayData {
  const [bridge, setBridge] = useState<HexpickBridge | null>(null);
  const [snapshot, setSnapshot] = useState<PluginSnapshot | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const unsubs: (() => void)[] = [];
    getBridge()
      .then(async (b) => {
        const [p, s] = await Promise.all([b.getPlugins(), b.getSettings()]);
        if (cancelled) return;
        setBridge(b);
        setSnapshot(p);
        setSettings(s);
        unsubs.push(b.onPluginsChanged(setSnapshot), b.onSettingsChanged(setSettings));
      })
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
    };
  }, []);

  const plugins = useMemo(() => snapshot?.plugins.filter((p) => p.enabled) ?? [], [snapshot]);
  const active = useMemo(
    () => plugins.find((p) => p.plugin.id === settings?.lastPluginId) ?? plugins[0] ?? null,
    [plugins, settings?.lastPluginId],
  );
  return { bridge, snapshot, settings, plugins, active, loadError };
}
