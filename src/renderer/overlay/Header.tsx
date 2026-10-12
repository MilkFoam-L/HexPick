import type { LoadedPlugin } from '../../shared/ipc';
import type { Session } from '../../shared/session';
import { gameAsset } from '../common/theme';

export function PluginTabs({ plugins, activeId, onSelect }: { plugins: readonly LoadedPlugin[]; activeId: string; onSelect(id: string): void }) {
  if (plugins.length < 2) return null;
  return (
    <nav className="hx-tabs" aria-label="切换插件">
      {plugins.map((p) => (
        <button
          key={p.plugin.id}
          type="button"
          className={`hx-tab ${p.plugin.id === activeId ? 'is-active' : ''}`}
          aria-current={p.plugin.id === activeId}
          onClick={() => onSelect(p.plugin.id)}
        >
          {p.plugin.icon && p.plugin.icon.length <= 4 && <span aria-hidden>{p.plugin.icon}</span>}
          {p.plugin.name}
        </button>
      ))}
    </nav>
  );
}

/** 一局的进度：每次选择一颗六边形，已出现的品质点亮对应颜色 */
function TierPips({ lp, session }: { lp: LoadedPlugin; session: Session }) {
  const total = lp.plugin.rules.screens;
  if (total < 2) return null;
  return (
    <ol className="hx-pips" aria-label={`第 ${Math.min(session.screenIndex + 1, total)} / ${total} 次选择`}>
      {Array.from({ length: total }, (_, i) => {
        const tier = session.tiers[i];
        const current = i === session.screenIndex && session.phase !== 'summary';
        const stage = current ? 'current' : i < session.screenIndex || session.phase === 'summary' ? 'completed' : 'upcoming';
        return (
          <li key={i} className={`hx-pip is-${stage}`} title={tier ? lp.plugin.theme.labels[tier] : undefined}>
            <img src={gameAsset(`ui/stage_${stage}.png`)} alt="" draggable={false} />
          </li>
        );
      })}
    </ol>
  );
}

export function StageHeader({ lp, session }: { lp: LoadedPlugin; session: Session }) {
  const { rules, theme } = lp.plugin;
  const tier = session.current?.tier;
  let heading = '选择一个强化';
  if (session.phase === 'summary') heading = '本局强化';
  else if (session.phase === 'empty') heading = '池子已经抽空了';
  const step = rules.screens > 1 && session.phase !== 'summary' ? `第 ${session.screenIndex + 1} / ${rules.screens} 次` : null;
  return (
    <header className="hx-header">
      <p className="hx-eyebrow">
        {lp.plugin.icon && lp.plugin.icon.length <= 4 && <span aria-hidden>{lp.plugin.icon} </span>}
        {lp.plugin.name}
      </p>
      <h1 className={`hx-heading ${tier && session.phase !== 'summary' ? `tier-${tier}` : ''}`}>
        {heading}
        {tier && session.phase !== 'summary' && session.phase !== 'empty' && <span className="hx-heading__tier">{theme.labels[tier]}</span>}
      </h1>
      {step && <p className="hx-step">{step}</p>}
      <TierPips lp={lp} session={session} />
    </header>
  );
}
