import type { RoomId } from '../world/types';

/**
 * Sonido ambiental sintetizado con Web Audio: viento, chasquidos de fuego y un
 * acorde de fondo distinto por sala. No usa archivos externos (no hay recursos
 * de audio con licencia que dependan de la red) y está apagado por defecto.
 */

const CHORDS: Record<RoomId, number[]> = {
  exterior: [110, 164.8, 220],
  hall: [98, 146.8, 196],
  library: [130.8, 196, 246.9],
  alchemy: [87.3, 130.8, 207.7],
  armory: [98, 146.8, 185],
  throne: [110, 138.6, 164.8],
  treasure: [123.5, 185, 246.9],
  observatory: [146.8, 220, 293.7],
};

/** Cuánto viento y cuánto fuego se oye en cada sala (0..1). */
const MIX: Record<RoomId, { wind: number; fire: number }> = {
  exterior: { wind: 1, fire: 0.15 },
  hall: { wind: 0.2, fire: 0.9 },
  library: { wind: 0.3, fire: 0.15 },
  alchemy: { wind: 0.1, fire: 0.7 },
  armory: { wind: 0.2, fire: 0.6 },
  throne: { wind: 0.35, fire: 0.3 },
  treasure: { wind: 0.1, fire: 0.3 },
  observatory: { wind: 0.8, fire: 0.1 },
};

export type Sfx = 'tap' | 'clue' | 'secret' | 'open' | 'brew';

export class Ambient {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private windGain: GainNode | null = null;
  private pad: OscillatorNode[] = [];
  private crackle = 0;
  private fire = 0;
  private room: RoomId = 'exterior';
  private onVisibility = () => {
    if (!this.ctx) return;
    if (document.hidden) void this.ctx.suspend();
    else void this.ctx.resume();
  };

  get enabled(): boolean {
    return this.ctx !== null;
  }

  /** Debe llamarse desde un gesto del usuario (política de autoplay). */
  enable(): void {
    if (this.ctx) return;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    master.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 1.5);
    this.master = master;

    // viento: ruido filtrado con una modulación lenta
    const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noise.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = last * 3.5;
    }
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 420;
    band.Q.value = 0.6;
    const windGain = ctx.createGain();
    windGain.gain.value = 0;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain).connect(band.frequency);
    src.connect(band).connect(windGain).connect(master);
    src.start();
    lfo.start();
    this.windGain = windGain;

    // acorde de fondo
    const padGain = ctx.createGain();
    padGain.gain.value = 0.035;
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 900;
    padGain.connect(low).connect(master);
    this.pad = CHORDS[this.room].map((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 0 ? 'sine' : 'triangle';
      o.frequency.value = f;
      o.detune.value = (i - 1) * 4;
      o.connect(padGain);
      o.start();
      return o;
    });

    // chasquidos de fuego programados al azar
    this.crackle = window.setInterval(() => this.pop(), 90);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.setRoom(this.room);
  }

  disable(): void {
    if (!this.ctx) return;
    window.clearInterval(this.crackle);
    document.removeEventListener('visibilitychange', this.onVisibility);
    const ctx = this.ctx;
    this.master?.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
    window.setTimeout(() => void ctx.close(), 500);
    this.ctx = null;
    this.master = this.windGain = null;
    this.pad = [];
  }

  setRoom(room: RoomId): void {
    this.room = room;
    const ctx = this.ctx;
    if (!ctx || !this.windGain) return;
    const now = ctx.currentTime;
    const mix = MIX[room];
    this.windGain.gain.cancelScheduledValues(now);
    this.windGain.gain.linearRampToValueAtTime(0.12 * mix.wind, now + 2);
    this.fire = mix.fire;
    CHORDS[room].forEach((f, i) => this.pad[i]?.frequency.linearRampToValueAtTime(f, now + 2.5));
  }

  private pop(): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || Math.random() > this.fire * 0.35) return;
    const len = 0.02 + Math.random() * 0.03;
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * len), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 900 + Math.random() * 1500;
    const g = ctx.createGain();
    g.gain.value = 0.05 + Math.random() * 0.08;
    src.connect(hp).connect(g).connect(this.master);
    src.start();
  }

  private tone(freq: number, at: number, dur: number, type: OscillatorType, vol: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = ctx.createGain();
    const t = ctx.currentTime + at;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  sfx(kind: Sfx): void {
    if (!this.ctx) return;
    switch (kind) {
      case 'tap':
        this.tone(220, 0, 0.12, 'triangle', 0.12);
        break;
      case 'clue':
        [659.3, 880, 1318.5].forEach((f, i) => this.tone(f, i * 0.09, 0.9, 'triangle', 0.1));
        break;
      case 'secret':
        [1046.5, 1318.5, 1568, 2093].forEach((f, i) => this.tone(f, i * 0.06, 0.5, 'sine', 0.07));
        break;
      case 'brew':
        for (let i = 0; i < 6; i++) this.tone(180 + Math.random() * 240, i * 0.07, 0.15, 'sine', 0.08);
        break;
      case 'open':
        // la melodía de la caja de música
        [523.3, 659.3, 784, 659.3, 587.3, 523.3, 392, 523.3].forEach((f, i) => this.tone(f, i * 0.22, 0.6, 'sine', 0.1));
        break;
    }
  }
}
