import { useEffect, useRef, useState, type CSSProperties } from 'react';

/** 选择倒计时：窗口隐藏时暂停，到时触发 onExpire。 */
export function PickTimer({ seconds, onExpire }: { seconds: number; onExpire: () => void }) {
  const [left, setLeft] = useState(seconds);
  const expire = useRef(onExpire);
  expire.current = onExpire;

  const [visible, setVisible] = useState(document.visibilityState === 'visible');

  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    if (left <= 0) {
      expire.current();
      return;
    }
    if (!visible) return; // 浮层隐藏时暂停
    const t = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [left, visible]);

  const style = { '--progress': left / seconds } as CSSProperties;
  return (
    <div className={`hx-timer ${left <= 5 ? 'is-urgent' : ''}`} style={style} role="timer" aria-label={`剩余 ${left} 秒`}>
      <svg viewBox="0 0 40 40" aria-hidden>
        <circle cx="20" cy="20" r="17" className="hx-timer__track" />
        <circle cx="20" cy="20" r="17" className="hx-timer__bar" pathLength={1} />
      </svg>
      <span>{left}</span>
    </div>
  );
}
