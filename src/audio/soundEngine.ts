/**
 * Synthesized Web Audio API speedcubing turn sound engine.
 * Provides 3 tactile speedcube acoustic profiles with zero network asset latency.
 */

export type TurnSoundProfile = 'magnetic' | 'clack' | 'lubed';

export interface TurnSoundMeta {
  id: TurnSoundProfile;
  name: string;
  description: string;
}

export const TURN_SOUND_PROFILES: Record<TurnSoundProfile, TurnSoundMeta> = {
  magnetic: {
    id: 'magnetic',
    name: 'Magnetic Snap',
    description: 'Crisp MagLev click with subtle magnetic detent',
  },
  clack: {
    id: 'clack',
    name: 'Crisp Clack',
    description: 'Bright dry competition plastic snap',
  },
  lubed: {
    id: 'lubed',
    name: 'Soft Lubed',
    description: 'Damped cushioned silicone thock',
  },
};

const PROFILE_KEY = 'eicube_sfx_profile_v1';
const VOLUME_KEY = 'eicube_sfx_volume_v1';
const DEFAULT_VOLUME = 0.55;

export function clampVolume(value: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return DEFAULT_VOLUME;
  return Math.round(Math.max(0, Math.min(1, value)) * 100) / 100;
}

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private profile: TurnSoundProfile;
  private volume: number;
  private lastPlayTimeMs: number = 0;

  constructor() {
    this.profile = this.loadProfile();
    this.volume = this.loadVolume();
  }

  private loadProfile(): TurnSoundProfile {
    try {
      const saved = localStorage.getItem(PROFILE_KEY) as TurnSoundProfile | null;
      if (saved && saved in TURN_SOUND_PROFILES) return saved;
    } catch {
      // Ignore storage read errors (e.g. SSR/tests)
    }
    return 'magnetic';
  }

  private loadVolume(): number {
    try {
      const saved = localStorage.getItem(VOLUME_KEY);
      if (saved !== null) {
        return clampVolume(parseFloat(saved));
      }
    } catch {
      // Ignore storage read errors
    }
    return DEFAULT_VOLUME;
  }

  public getProfile(): TurnSoundProfile {
    return this.profile;
  }

  public setProfile(profile: TurnSoundProfile): void {
    if (!(profile in TURN_SOUND_PROFILES)) return;
    this.profile = profile;
    try {
      localStorage.setItem(PROFILE_KEY, profile);
    } catch {
      // Ignore storage write errors
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number): void {
    this.volume = clampVolume(vol);
    try {
      localStorage.setItem(VOLUME_KEY, String(this.volume));
    } catch {
      // Ignore storage write errors
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    if (!this.noiseBuffer) {
      const len = Math.floor(this.ctx.sampleRate * 0.06);
      const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.28));
      }
      this.noiseBuffer = buffer;
    }

    return this.ctx;
  }

  public playTurn(isScramble: boolean = false): void {
    if (this.volume <= 0.005) return;
    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (isScramble && nowMs - this.lastPlayTimeMs < 32) return;
    this.lastPlayTimeMs = nowMs;

    const gainScale = isScramble ? this.volume * 0.42 : this.volume;
    this.triggerSynth(this.profile, gainScale);
  }

  public preview(profile?: TurnSoundProfile): void {
    const targetProfile = profile ?? this.profile;
    const gainScale = this.volume > 0.02 ? this.volume : 0.45;
    this.triggerSynth(targetProfile, gainScale);
  }

  private triggerSynth(profile: TurnSoundProfile, gainScale: number): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;

    const now = ctx.currentTime;

    // 1. Filtered noise transient (plastic/tile contact)
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    const noiseGain = ctx.createGain();

    if (profile === 'magnetic') {
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1850, now);
      filter.frequency.exponentialRampToValueAtTime(920, now + 0.028);
      filter.Q.value = 1.8;

      noiseGain.gain.setValueAtTime(0.001, now);
      noiseGain.gain.linearRampToValueAtTime(0.45 * gainScale, now + 0.003);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.032);
    } else if (profile === 'clack') {
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1650, now);
      filter.Q.value = 1.2;

      noiseGain.gain.setValueAtTime(0.001, now);
      noiseGain.gain.linearRampToValueAtTime(0.55 * gainScale, now + 0.002);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
    } else {
      // Soft lubed
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(780, now);
      filter.Q.value = 0.8;

      noiseGain.gain.setValueAtTime(0.001, now);
      noiseGain.gain.linearRampToValueAtTime(0.36 * gainScale, now + 0.004);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    }

    noiseSrc.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseSrc.start(now);
    noiseSrc.stop(now + 0.055);

    // 2. Subtle pitched body / magnetic detent
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    if (profile === 'magnetic') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(115, now + 0.022);
      oscGain.gain.setValueAtTime(0.24 * gainScale, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
    } else if (profile === 'clack') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.016);
      oscGain.gain.setValueAtTime(0.16 * gainScale, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(195, now);
      osc.frequency.exponentialRampToValueAtTime(95, now + 0.032);
      oscGain.gain.setValueAtTime(0.28 * gainScale, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.034);
    }

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.045);
  }
}

export const soundEngine = new SoundEngine();
