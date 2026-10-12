/**
 * 实时合成的界面音效（不使用任何游戏素材）。插件可在 theme.sounds 里用自己的音频文件覆盖。
 */
import type { Rarity, SoundKey } from '../../shared/plugin';

type Cue = SoundKey | 'reroll' | 'hover';

let ctx: AudioContext | null = null;
const audio = (): AudioContext => (ctx ??= new AudioContext());

function tone(at: number, freq: number, dur: number, gain: number, type: OscillatorType, out: AudioNode): void {
  const a = audio();
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(gain, at + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(g).connect(out);
  osc.start(at);
  osc.stop(at + dur + 0.05);
}

function noise(at: number, dur: number, gain: number, from: number, to: number, out: AudioNode): void {
  const a = audio();
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  const filter = a.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(from, at);
  filter.frequency.exponentialRampToValueAtTime(to, at + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(gain, at + dur * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(filter).connect(g).connect(out);
  src.start(at);
}

/** 简单的回声，让棱彩音效更“亮” */
function withEcho(out: AudioNode): AudioNode {
  const a = audio();
  const input = a.createGain();
  const delay = a.createDelay();
  const fb = a.createGain();
  delay.delayTime.value = 0.13;
  fb.gain.value = 0.32;
  input.connect(out);
  input.connect(delay).connect(fb).connect(delay);
  fb.connect(out);
  return input;
}

const SYNTH: Record<Cue, (t: number, out: AudioNode) => void> = {
  silver: (t, o) => {
    noise(t, 0.35, 0.18, 600, 3000, o);
    tone(t + 0.12, 880, 0.5, 0.12, 'sine', o);
  },
  gold: (t, o) => {
    noise(t, 0.4, 0.2, 500, 4000, o);
    tone(t + 0.1, 784, 0.6, 0.12, 'triangle', o);
    tone(t + 0.2, 1175, 0.8, 0.1, 'sine', o);
  },
  prismatic: (t, o) => {
    const echo = withEcho(o);
    noise(t, 0.6, 0.22, 300, 6000, o);
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(t + 0.08 + i * 0.07, f, 0.9, 0.09, 'triangle', echo));
  },
  pick: (t, o) => {
    tone(t, 110, 0.35, 0.3, 'sine', o);
    tone(t + 0.02, 988, 0.5, 0.12, 'triangle', o);
    tone(t + 0.1, 1480, 0.7, 0.08, 'sine', o);
  },
  reroll: (t, o) => noise(t, 0.28, 0.25, 4000, 500, o),
  hover: (t, o) => tone(t, 1600, 0.05, 0.04, 'square', o),
};

export interface SoundOptions {
  readonly volume: number;
  readonly muted: boolean;
  /** 插件自定义音效的 URL */
  readonly custom: Partial<Record<SoundKey, string>>;
}

export function play(cue: Cue, opts: SoundOptions): void {
  if (opts.muted || opts.volume <= 0) return;
  const url = cue in opts.custom ? opts.custom[cue as SoundKey] : undefined;
  if (url) {
    const el = new Audio(url);
    el.volume = opts.volume;
    el.play().catch((e) => console.warn('[sound] 插件音效播放失败', e));
    return;
  }
  try {
    const a = audio();
    if (a.state === 'suspended') void a.resume();
    const master = a.createGain();
    master.gain.value = opts.volume;
    master.connect(a.destination);
    SYNTH[cue](a.currentTime + 0.01, master);
  } catch (e) {
    console.warn('[sound] 合成音效失败', e);
  }
}

export const revealCue = (tier: Rarity): Cue => tier;
