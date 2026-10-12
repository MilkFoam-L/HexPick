import { useEffect, useRef, useState } from 'react';
import { acceleratorFromEvent, formatAccelerator } from '../../shared/hotkey';
import type { HexpickBridge } from '../../shared/ipc';

const HELD_SYMBOLS: [keyof KeyboardEvent, string][] = [
  ['ctrlKey', '⌃'],
  ['altKey', '⌥'],
  ['shiftKey', '⇧'],
  ['metaKey', '⌘'],
];

/** 点击后按下新组合键即保存；录制期间暂停全局快捷键，避免按到旧组合键时弹出浮层。 */
export function HotkeyRecorder({ bridge, value }: { bridge: HexpickBridge; value: string }) {
  const [recording, setRecording] = useState(false);
  const [held, setHeld] = useState('');
  const [message, setMessage] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!recording) return;
    bridge.suspendHotkey(true);
    const stop = () => {
      setRecording(false);
      setHeld('');
    };
    const onKey = async (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        stop();
        return;
      }
      setHeld(HELD_SYMBOLS.filter(([k]) => e[k]).map(([, s]) => s).join(''));
      const r = acceleratorFromEvent(e);
      if (r.kind === 'pending') return;
      if (r.kind === 'invalid') {
        setMessage({ kind: 'error', text: r.reason });
        return;
      }
      stop();
      const res = await bridge.setHotkey(r.accelerator);
      setMessage(res.ok ? { kind: 'ok', text: `已改为 ${formatAccelerator(r.accelerator)}` } : { kind: 'error', text: res.error });
    };
    const onKeyUp = (e: KeyboardEvent) => setHeld(HELD_SYMBOLS.filter(([k]) => e[k]).map(([, s]) => s).join(''));
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', stop);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('blur', stop);
      bridge.suspendHotkey(false);
    };
  }, [recording, bridge]);

  return (
    <div className="hotkey">
      <button
        ref={button}
        type="button"
        className={`hotkey__field ${recording ? 'is-recording' : ''}`}
        onClick={() => {
          setMessage(null);
          setRecording((r) => !r);
        }}
        aria-live="polite"
      >
        {recording ? held || '请按下新的组合键…' : formatAccelerator(value)}
      </button>
      <p className={`hint ${message?.kind === 'error' ? 'is-error' : ''}`}>
        {recording && message?.kind !== 'error' ? '按 Esc 取消' : (message?.text ?? '点击后按下新的组合键')}
      </p>
      {value === 'Command+H' && !recording && (
        <p className="hint is-warn">⌘H 原本是系统“隐藏应用”的快捷键，占用后所有应用里的 ⌘H 都会呼出 HexPick。</p>
      )}
    </div>
  );
}
