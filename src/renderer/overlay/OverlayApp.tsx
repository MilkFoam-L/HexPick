import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LoadedPlugin } from '../../shared/ipc';
import type { Settings } from '../../shared/settings';
import { play, type SoundOptions } from '../common/sound';
import { assetUrl, backgroundUrl, themeStyle } from '../common/theme';
import { CardView } from './CardView';
import { PluginTabs, StageHeader } from './Header';
import { PickTimer } from './PickTimer';
import { Summary } from './Summary';
import { useOverlayData } from './useOverlayData';
import { useSession, type SessionEvent } from './useSession';

/** 选中动画（光环 + 溶解）播完后再进入下一次选择 */
const AUTO_ADVANCE_MS = 1500;

function soundOptions(settings: Settings | null, lp: LoadedPlugin | null): SoundOptions {
  const custom: SoundOptions['custom'] = {};
  if (lp) for (const [k, v] of Object.entries(lp.plugin.theme.sounds)) custom[k as keyof typeof custom] = assetUrl(lp.baseUrl, v);
  return { volume: settings?.volume ?? 0.6, muted: settings?.muted ?? false, custom };
}

function Kbd({ k, children }: { k: string; children: string }) {
  return (
    <span className="hx-hint">
      <kbd>{k}</kbd>
      {children}
    </span>
  );
}

export function OverlayApp() {
  const { bridge, snapshot, settings, plugins, active, loadError } = useOverlayData();
  const [hovered, setHovered] = useState<number | null>(null);
  const [shownCount, setShownCount] = useState(0);
  const sound = useRef<SoundOptions>(soundOptions(null, null));
  sound.current = soundOptions(settings, active);

  const onEvent = useCallback((e: SessionEvent) => {
    if (e.type === 'reveal' && e.session.current) play(e.session.current.tier, sound.current);
    else if (e.type === 'reroll') play('reroll', sound.current);
    else if (e.type === 'pick') play('pick', sound.current);
  }, []);
  const api = useSession(active, onEvent);
  const { session } = api;

  useEffect(() => bridge?.onOverlayShown(() => setShownCount((n) => n + 1)), [bridge]);

  const screenKey = `${active?.plugin.id}-${shownCount}-${session?.tiers.length ?? 0}`;
  // 和游戏一致：选中后播完动画自动进入下一次选择（只抽一次的插件保留结果）
  const autoAdvance = session?.phase === 'picked' && (active?.plugin.rules.screens ?? 1) > 1;
  const nextRef = useRef(api.next);
  nextRef.current = api.next;
  useEffect(() => {
    if (!autoAdvance) return;
    const t = setTimeout(() => nextRef.current(), AUTO_ADVANCE_MS);
    return () => clearTimeout(t);
  }, [autoAdvance, screenKey]);
  // 换一批卡后清空悬停记录，避免按 R 刷新到上一批的位置
  useEffect(() => setHovered(null), [screenKey]);

  const hide = useCallback(() => bridge?.hideOverlay(), [bridge]);
  const selectPlugin = useCallback((id: string) => void bridge?.setSettings({ lastPluginId: id }), [bridge]);
  const cyclePlugin = useCallback(
    (dir: 1 | -1) => {
      if (!active || plugins.length < 2) return;
      const i = plugins.findIndex((p) => p.plugin.id === active.plugin.id);
      selectPlugin(plugins[(i + dir + plugins.length) % plugins.length].plugin.id);
    },
    [active, plugins, selectPlugin],
  );
  const primary = useCallback(() => {
    if (!session || !active) return;
    if (session.phase === 'picked') {
      // 只有一次选择的插件，选完直接开新局
      if (active.plugin.rules.screens === 1) api.restart();
      else api.next();
    } else if (session.phase === 'summary') api.restart();
  }, [session, active, api]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === ',') return bridge?.openSettings();
      if (e.metaKey || e.ctrlKey) return;
      if (e.key === 'Escape') return hide();
      if (e.key === 'Tab') {
        e.preventDefault();
        return cyclePlugin(e.shiftKey ? -1 : 1);
      }
      if (e.code === 'KeyM' && settings) return void bridge?.setSettings({ muted: !settings.muted });
      if (!session) return;
      const n = Number(e.key);
      if (session.phase === 'choosing' && Number.isInteger(n) && n >= 1 && n <= (session.current?.cards.length ?? 0)) return api.pick(n - 1);
      if (e.code === 'KeyR' && hovered !== null) return api.reroll(hovered);
      if (e.code === 'Space' || e.key === 'Enter') {
        if (session.phase === 'choosing' && e.key === 'Enter') return; // Enter 交给获得焦点的按钮
        e.preventDefault();
        primary();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [bridge, hide, cyclePlugin, settings, session, api, hovered, primary]);

  const style = useMemo(() => (active ? themeStyle(active.plugin) : undefined), [active]);
  const bgUrl = active ? backgroundUrl(active.baseUrl, active.plugin.theme.backgroundImage) : gameAssetBg;

  if (loadError) return <Shell onClose={hide}><p className="hx-empty">无法加载：{loadError}</p></Shell>;
  if (!snapshot || !settings) return <Shell onClose={hide} />;
  if (!active) {
    return (
      <Shell onClose={hide}>
        <div className="hx-empty">
          <h1 className="hx-heading">还没有可用的插件</h1>
          <p>在插件目录里放一个包含 plugin.json 的文件夹，或在设置里新建插件。</p>
          <div className="hx-actions">
            <button type="button" className="hx-btn" onClick={() => bridge?.openSettings()}>打开设置</button>
          </div>
        </div>
      </Shell>
    );
  }

  const phase = session?.phase ?? 'choosing';
  const { rules } = active.plugin;
  const primaryLabel = phase === 'summary' || rules.screens === 1 ? '再来一局' : session && session.screenIndex + 1 >= rules.screens ? '查看本局' : '下一次选择';

  return (
    <Shell onClose={hide} style={style} bgUrl={bgUrl} warn={snapshot.errors.length} onWarn={() => bridge?.openSettings()}>
      <PluginTabs plugins={plugins} activeId={active.plugin.id} onSelect={selectPlugin} />
      {session && <StageHeader lp={active} session={session} />}

      <main className="hx-stage">
        {session?.phase === 'summary' && <Summary lp={active} picks={session.picks} />}
        {session?.phase === 'empty' && <p className="hx-empty">所有条目都已被选走。重置后可以重新开始。</p>}
        {session?.current && (session.phase === 'choosing' || session.phase === 'picked') && (
          <div className="hx-row" data-count={session.current.cards.length}>
            {session.current.cards.map((card, i) => (
              <CardView
                key={i}
                card={card}
                index={i}
                lp={active}
                phase={session.phase}
                pickedIndex={session.pickedIndex}
                animKey={`${screenKey}-${card.item.id}`}
                onPick={api.pick}
                onReroll={api.reroll}
                onHover={(h) => {
                  setHovered(h);
                  if (h !== null && session.phase === 'choosing') play('hover', sound.current);
                }}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="hx-footer">
        {session?.phase === 'choosing' && rules.pickTimer > 0 && (
          <PickTimer key={screenKey} seconds={rules.pickTimer} onExpire={() => api.pick(Math.floor(Math.random() * (session.current?.cards.length ?? 1)))} />
        )}
        <div className="hx-actions">
          {((phase === 'picked' && !autoAdvance) || phase === 'summary') && (
            <button type="button" className="hx-btn hx-btn--primary" onClick={primary} autoFocus>
              {primaryLabel}
              <kbd>Space</kbd>
            </button>
          )}
          {api.retiredCount > 0 && (
            <button type="button" className="hx-btn" onClick={api.resetRetired}>
              重置已选（{api.retiredCount}）
            </button>
          )}
        </div>
        <div className="hx-hints">
          {phase === 'choosing' && <Kbd k={`1-${session?.current?.cards.length ?? 3}`}>选择</Kbd>}
          {autoAdvance && <Kbd k="Space">跳过</Kbd>}
          {phase === 'choosing' && rules.rerollsPerCard > 0 && <Kbd k="R">刷新悬停的卡</Kbd>}
          {plugins.length > 1 && <Kbd k="Tab">切换插件</Kbd>}
          <Kbd k="M">{settings.muted ? '取消静音' : '静音'}</Kbd>
          <Kbd k="Esc">关闭</Kbd>
        </div>
      </footer>
    </Shell>
  );
}

const gameAssetBg = backgroundUrl('', 'abyss');

function Shell(props: {
  children?: React.ReactNode;
  style?: React.CSSProperties;
  bgUrl?: string | null;
  warn?: number;
  onClose(): void;
  onWarn?(): void;
}) {
  return (
    <div className="hx-overlay" style={props.style} role="dialog" aria-modal="true" aria-label="HexPick">
      <div
        className={`hx-backdrop ${props.bgUrl === null ? 'is-bare' : ''}`}
        style={{ '--hx-bg-image': props.bgUrl === null ? 'none' : `url("${props.bgUrl ?? gameAssetBg}")` } as React.CSSProperties}
        aria-hidden
      />
      <div className="hx-topbar">
        {!!props.warn && (
          <button type="button" className="hx-warn" onClick={props.onWarn}>
            ⚠️ {props.warn} 个插件加载失败
          </button>
        )}
        <button type="button" className="hx-close" onClick={props.onClose} aria-label="关闭">
          ✕
        </button>
      </div>
      {props.children}
    </div>
  );
}

