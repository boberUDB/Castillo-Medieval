import type { RoomId } from '../world/types';

/**
 * Música generativa del castillo, sintetizada con Web Audio (sin archivos).
 *
 * La idea: una caja de música que alguien dejó sonando en un castillo vacío.
 * - El tema del rey (re menor, lento como una nana) suena por fragmentos, con
 *   silencios largos entre frase y frase.
 * - Cada nota vuelve en ecos (delay con realimentación) dentro de una reverb
 *   de sala de piedra: el castillo repite lo que oye.
 * - Debajo, un bordón grave que respira; y de vez en cuando algo que no
 *   debería estar ahí: una campana lejana, una puerta que cruje, una nota
 *   fuera de lugar. Poco frecuente para que inquiete sin cansar.
 */

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

/** Re menor natural (eólico), dos octavas desde re4. */
const SCALE = [62, 64, 65, 67, 69, 70, 72, 74, 76, 77, 79, 81];

/** El tema del rey: [nota MIDI, duración en pulsos]. Es también la melodía del cofre. */
export const THEME: [number, number][] = [
  [69, 1], [74, 1], [77, 1], [76, 1.5], [74, 0.5], [72, 1], [74, 2], [69, 1],
  [70, 1], [69, 1], [67, 1], [65, 1.5], [64, 0.5], [65, 1], [62, 3],
];

interface RoomMood {
  /** 0..1: cuánto viento. */
  wind: number;
  /** 0..1: bordón grave. */
  drone: number;
  /** 0..1: coro fantasmal. */
  choir: number;
  /** Frases por minuto aproximadas de la caja de música. */
  density: number;
  /** Desplazamiento de octava de la melodía. */
  octave: number;
  /** Probabilidad de que la frase sea el tema del rey. */
  theme: number;
  /** Crujidos y campanas. */
  eerie: number;
  /** Chasquidos de fuego (muy suaves). */
  fire: number;
  /** Apertura del filtro del bordón (Hz). */
  darkness: number;
}

const MOODS: Record<RoomId, RoomMood> = {
  exterior: { wind: 1, drone: 0.5, choir: 0, density: 2.2, octave: 0, theme: 0.6, eerie: 0.7, fire: 0, darkness: 320 },
  hall: { wind: 0.15, drone: 0.8, choir: 0, density: 3, octave: 0, theme: 0.35, eerie: 0.6, fire: 0.5, darkness: 260 },
  library: { wind: 0.2, drone: 0.5, choir: 0.15, density: 3.5, octave: 12, theme: 0.3, eerie: 0.5, fire: 0.1, darkness: 300 },
  alchemy: { wind: 0.05, drone: 1, choir: 0, density: 2.2, octave: -12, theme: 0.2, eerie: 0.9, fire: 0.4, darkness: 190 },
  armory: { wind: 0.15, drone: 0.8, choir: 0, density: 2.5, octave: -12, theme: 0.3, eerie: 0.5, fire: 0.4, darkness: 230 },
  throne: { wind: 0.3, drone: 1, choir: 0.9, density: 2.2, octave: 0, theme: 0.5, eerie: 0.6, fire: 0.1, darkness: 280 },
  treasure: { wind: 0.05, drone: 0.6, choir: 0.3, density: 3, octave: 0, theme: 0.9, eerie: 0.4, fire: 0.1, darkness: 240 },
  observatory: { wind: 0.7, drone: 0.4, choir: 0.5, density: 3, octave: 12, theme: 0.6, eerie: 0.3, fire: 0, darkness: 380 },
};

export type Sfx = 'tap' | 'clue' | 'secret' | 'open' | 'brew' | 'stars';

const BEAT = 0.95; // segundos por pulso: muy lento

export class Ambient {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null; // entrada del bus con ecos y reverb
  private dry: GainNode | null = null; // bus solo con reverb
  private windGain: GainNode | null = null;
  private droneGain: GainNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  private choirGain: GainNode | null = null;
  private meter: AnalyserNode | null = null;
  private timer = 0;
  private mood: RoomMood = MOODS.exterior;
  private room: RoomId = 'exterior';
  private queue: { at: number; note: number; dur: number; vel: number }[] = [];
  private nextPhrase = 0;
  private nextEerie = 0;
  private onVisibility = () => {
    if (!this.ctx) return;
    if (document.hidden) void this.ctx.suspend();
    else void this.ctx.resume();
  };

  get enabled(): boolean {
    return this.ctx !== null;
  }

  /** Solo para pruebas: nivel RMS y pico de la salida (0..1). */
  level(): { rms: number; peak: number } | null {
    if (!this.meter) return null;
    const buf = new Float32Array(this.meter.fftSize);
    this.meter.getFloatTimeDomainData(buf);
    let sum = 0;
    let peak = 0;
    for (const v of buf) {
      sum += v * v;
      peak = Math.max(peak, Math.abs(v));
    }
    return { rms: Math.sqrt(sum / buf.length), peak };
  }

  /** Debe llamarse desde un gesto del usuario (política de autoplay). */
  enable(): void {
    if (this.ctx) return;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;
    const now = ctx.currentTime;

    // salida: compresor suave para que nada sature
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.ratio.value = 3;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(1, now + 4);
    const meter = ctx.createAnalyser();
    meter.fftSize = 2048;
    master.connect(comp).connect(meter).connect(ctx.destination);
    this.master = master;
    this.meter = meter;

    // reverb de sala de piedra (respuesta al impulso generada)
    const reverb = ctx.createConvolver();
    reverb.buffer = this.impulse(ctx, 4.5, 2.6);
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    reverb.connect(wet).connect(master);

    // ecos: el castillo repite cada nota, cada vez más oscura y lejana
    const delay = ctx.createDelay(2);
    delay.delayTime.value = BEAT * 0.75;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.42;
    const darken = ctx.createBiquadFilter();
    darken.type = 'lowpass';
    darken.frequency.value = 1600;
    delay.connect(darken).connect(feedback).connect(delay);
    const echoOut = ctx.createGain();
    echoOut.gain.value = 0.5;
    darken.connect(echoOut);
    echoOut.connect(master);
    echoOut.connect(reverb);

    const music = ctx.createGain();
    music.gain.value = 1;
    music.connect(master);
    music.connect(reverb);
    music.connect(delay);
    this.music = music;

    const dry = ctx.createGain();
    dry.connect(master);
    dry.connect(reverb);
    this.dry = dry;

    // viento: ruido rosa filtrado, con ráfagas lentas
    const noise = this.noiseBuffer(ctx, 4);
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = noise;
    windSrc.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 500;
    windFilter.Q.value = 0.9;
    const windGain = ctx.createGain();
    windGain.gain.value = 0;
    const gust = ctx.createOscillator();
    gust.frequency.value = 0.045;
    const gustDepth = ctx.createGain();
    gustDepth.gain.value = 260;
    gust.connect(gustDepth).connect(windFilter.frequency);
    windSrc.connect(windFilter).connect(windGain).connect(dry);
    windSrc.start();
    gust.start();
    this.windGain = windGain;

    // bordón: re y la graves, casi inaudibles, que respiran
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 280;
    droneFilter.Q.value = 2;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0;
    const breath = ctx.createOscillator();
    breath.frequency.value = 0.06;
    const breathDepth = ctx.createGain();
    breathDepth.gain.value = 90;
    breath.connect(breathDepth).connect(droneFilter.frequency);
    breath.start();
    for (const [n, det] of [
      [38, -4],
      [38, 5],
      [45, 2],
    ]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = midi(n);
      o.detune.value = det;
      o.connect(droneFilter);
      o.start();
    }
    droneFilter.connect(droneGain).connect(dry);
    this.droneGain = droneGain;
    this.droneFilter = droneFilter;

    // coro fantasmal: vocal "a" formada con dos filtros sobre un acorde menor
    const choirGain = ctx.createGain();
    choirGain.gain.value = 0;
    const f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.value = 750;
    f1.Q.value = 6;
    const f2 = ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.value = 1150;
    f2.Q.value = 7;
    const vib = ctx.createOscillator();
    vib.frequency.value = 4.6;
    const vibDepth = ctx.createGain();
    vibDepth.gain.value = 6;
    vib.connect(vibDepth);
    vib.start();
    for (const n of [57, 62, 65, 69]) {
      for (const det of [-9, 8]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = midi(n);
        o.detune.value = det;
        vibDepth.connect(o.detune);
        o.connect(f1);
        o.connect(f2);
        o.start();
      }
    }
    f1.connect(choirGain);
    f2.connect(choirGain);
    choirGain.connect(dry);
    this.choirGain = choirGain;

    this.nextPhrase = now + 2.5;
    this.nextEerie = now + 12 + Math.random() * 10;
    this.timer = window.setInterval(() => this.schedule(), 120);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.setRoom(this.room);
  }

  disable(): void {
    if (!this.ctx) return;
    window.clearInterval(this.timer);
    document.removeEventListener('visibilitychange', this.onVisibility);
    const ctx = this.ctx;
    this.master?.gain.cancelScheduledValues(ctx.currentTime);
    this.master?.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
    window.setTimeout(() => void ctx.close(), 1200);
    this.ctx = null;
    this.master = this.music = this.dry = this.windGain = this.droneGain = this.droneFilter = this.choirGain = this.meter = null;
    this.queue = [];
  }

  setRoom(room: RoomId): void {
    this.room = room;
    this.mood = MOODS[room];
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const m = this.mood;
    // transiciones lentas: nada cambia de golpe
    this.windGain?.gain.setTargetAtTime(0.035 * m.wind, t, 1.5);
    this.droneGain?.gain.setTargetAtTime(0.05 * m.drone, t, 2.5);
    this.droneFilter?.frequency.setTargetAtTime(m.darkness, t, 2.5);
    this.choirGain?.gain.setTargetAtTime(0.018 * m.choir, t, 3);
  }

  /* ------------------------------ composición ------------------------------ */

  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    const horizon = now + 0.3;

    if (this.queue.length === 0 && now >= this.nextPhrase - 0.3) this.compose(Math.max(now + 0.05, this.nextPhrase));
    while (this.queue.length && this.queue[0].at < horizon) {
      const n = this.queue.shift()!;
      this.musicBox(n.note, n.at, n.dur, n.vel);
    }

    if (now >= this.nextEerie) {
      this.eerie(now + 0.1);
      const wait = 22 + Math.random() * 30;
      this.nextEerie = now + wait / Math.max(0.2, this.mood.eerie);
    }
    if (this.mood.fire > 0 && Math.random() < this.mood.fire * 0.04) this.crackle(now + 0.05);
  }

  /** Una frase: un fragmento del tema del rey o una respuesta que deambula por la escala. */
  private compose(start: number): void {
    const m = this.mood;
    let t = start;
    const oct = m.octave;
    if (Math.random() < m.theme) {
      // medio tema, o el tema entero muy de vez en cuando
      const whole = Math.random() < 0.25;
      const half = Math.random() < 0.5 ? 0 : 8;
      const notes = whole ? THEME : THEME.slice(half, half + (half ? 7 : 8));
      notes.forEach(([n, d], i) => {
        this.queue.push({ at: t, note: n + oct, dur: d * BEAT, vel: 0.9 - (i % 3) * 0.12 });
        t += d * BEAT * (1 + (Math.random() - 0.5) * 0.06); // rubato de mecanismo cansado
      });
    } else {
      // deambular por pasos, terminando en re o la
      let idx = 4 + Math.floor(Math.random() * 3);
      const len = 3 + Math.floor(Math.random() * 4);
      for (let i = 0; i < len; i++) {
        let note = SCALE[idx] + oct;
        // una nota fuera de lugar (segunda menor o trítono): el castillo desafina
        if (Math.random() < 0.08) note += Math.random() < 0.5 ? 1 : 6;
        const d = [1, 1, 1.5, 2, 0.5][Math.floor(Math.random() * 5)];
        this.queue.push({ at: t, note, dur: d * BEAT, vel: 0.6 + Math.random() * 0.3 });
        t += d * BEAT;
        idx = Math.max(0, Math.min(SCALE.length - 1, idx + [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)]));
      }
      this.queue.push({ at: t, note: (Math.random() < 0.6 ? 62 : 69) + oct, dur: 3 * BEAT, vel: 0.7 });
      t += 3 * BEAT;
    }
    // silencio entre frases: deja que los ecos terminen
    const rest = 60 / Math.max(0.5, m.density) - (t - start);
    this.nextPhrase = t + Math.max(3.5, rest) * (0.8 + Math.random() * 0.5);
  }

  /* ------------------------------ instrumentos ------------------------------ */

  /** Caja de música: púa metálica con parcial agudo y cola larga. */
  private musicBox(note: number, at: number, dur: number, vel: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.music) return;
    const f = midi(note);
    const decay = Math.min(4.5, 1.6 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.22 * vel, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0008, at + decay);
    g.connect(this.music);
    const partials: [number, number][] = [
      [1, 1],
      [2, 0.28],
      [3.01, 0.08],
      [5.4, 0.035],
    ];
    for (const [mult, amp] of partials) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * mult;
      o.detune.value = (Math.random() - 0.5) * 6;
      const pg = ctx.createGain();
      pg.gain.setValueAtTime(amp, at);
      // los armónicos se apagan antes que la fundamental
      pg.gain.exponentialRampToValueAtTime(Math.max(0.0001, amp * (mult > 1 ? 0.02 : 0.2)), at + decay * (mult > 1 ? 0.35 : 1));
      o.connect(pg).connect(g);
      o.start(at);
      o.stop(at + decay + 0.1);
    }
  }

  /** Algo que no debería oírse en un castillo vacío. */
  private eerie(at: number): void {
    const r = Math.random();
    if (r < 0.4) this.bell(at);
    else if (r < 0.75) this.creak(at);
    else this.whisperChord(at);
  }

  /** Campana lejana con parciales inarmónicos. */
  private bell(at: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.dry) return;
    const base = midi(Math.random() < 0.5 ? 50 : 45);
    const out = ctx.createGain();
    out.gain.value = 0.045;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1400;
    out.connect(lp).connect(this.dry);
    for (const [mult, amp, dec] of [
      [0.5, 0.5, 7],
      [1, 1, 6],
      [1.19, 0.4, 4],
      [2.0, 0.35, 4],
      [2.74, 0.25, 3],
      [3.76, 0.15, 2],
    ]) {
      const o = ctx.createOscillator();
      o.frequency.value = base * mult;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(amp, at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dec);
      o.connect(g).connect(out);
      o.start(at);
      o.stop(at + dec + 0.1);
    }
  }

  /** Puerta o madera que cruje, en algún lugar. */
  private creak(at: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.dry) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(ctx, 2);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 18;
    bp.frequency.setValueAtTime(260, at);
    bp.frequency.exponentialRampToValueAtTime(620 + Math.random() * 300, at + 1.4);
    bp.frequency.exponentialRampToValueAtTime(380, at + 1.9);
    // la fricción es irregular: modulación rápida de volumen
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    for (let k = 0; k < 18; k++) g.gain.setValueAtTime(0.25 + Math.random() * 0.45, at + 0.1 + k * 0.1);
    g.gain.setValueAtTime(0, at + 2);
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 1.6 - 0.8;
    src.connect(bp).connect(g).connect(pan).connect(this.dry);
    src.start(at);
    src.stop(at + 2.1);
  }

  /** Un acorde disonante que aparece y se desvanece, como un suspiro. */
  private whisperChord(at: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.dry) return;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, at);
    out.gain.linearRampToValueAtTime(0.02, at + 2.5);
    out.gain.linearRampToValueAtTime(0, at + 6);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    out.connect(lp).connect(this.dry);
    for (const n of [62, 63, 68]) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = midi(n);
      o.detune.setValueAtTime(0, at);
      o.detune.linearRampToValueAtTime(-35, at + 6); // se hunde, como algo que se apaga
      o.connect(out);
      o.start(at);
      o.stop(at + 6.1);
    }
  }

  private crackle(at: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.dry) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(ctx, 0.03);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.03 + Math.random() * 0.03, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.03);
    src.connect(hp).connect(g).connect(this.dry);
    src.start(at);
  }

  /* ------------------------------ efectos de interacción ------------------------------ */

  sfx(kind: Sfx): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + 0.02;
    const oct = this.mood.octave > 0 ? 0 : 12;
    switch (kind) {
      case 'tap':
        // un golpe suave de madera, nada de pitidos
        this.knock(t);
        break;
      case 'clue':
        // re-fa-la-re en la caja de música: los ecos hacen el resto
        [62, 65, 69, 74].forEach((n, i) => this.musicBox(n + oct, t + i * 0.28, 1.5, 1));
        break;
      case 'secret':
        [81, 77, 86].forEach((n, i) => this.musicBox(n, t + i * 0.16, 1, 0.7));
        break;
      case 'brew':
        for (let i = 0; i < 7; i++) this.blub(t + i * 0.11 + Math.random() * 0.05);
        break;
      case 'stars': {
        // bajo las estrellas: el tema del rey, agudo y muy lento, con todos sus ecos
        this.queue = [];
        let at = t + 1.2;
        for (const [n, d] of THEME) {
          this.musicBox(n + 12, at, d * 1.1, 0.8);
          at += d * 1.1;
        }
        this.nextPhrase = at + 10;
        break;
      }
      case 'open': {
        // el tema completo del rey, al fin
        this.queue = [];
        let at = t;
        for (const [n, d] of THEME) {
          this.musicBox(n + 12, at, d * 0.5, 1);
          at += d * 0.5;
        }
        this.nextPhrase = at + 6;
        break;
      }
    }
  }

  private knock(at: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.dry) return;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(180, at);
    o.frequency.exponentialRampToValueAtTime(90, at + 0.08);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.12, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.12);
    o.connect(g).connect(this.dry);
    o.start(at);
    o.stop(at + 0.15);
  }

  private blub(at: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.dry) return;
    const o = ctx.createOscillator();
    const f = 160 + Math.random() * 220;
    o.frequency.setValueAtTime(f, at);
    o.frequency.exponentialRampToValueAtTime(f * 2.2, at + 0.09);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.07, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.1);
    o.connect(g).connect(this.dry);
    o.start(at);
    o.stop(at + 0.12);
  }

  /* ------------------------------ utilidades ------------------------------ */

  private noiseBuffer(ctx: BaseAudioContext, seconds: number): AudioBuffer {
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
    const d = buf.getChannelData(0);
    // ruido rosa aproximado (filtro de Paul Kellet simplificado)
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18;
    }
    return buf;
  }

  /** Respuesta al impulso estéreo: ruido con caída exponencial (sala de piedra). */
  private impulse(ctx: BaseAudioContext, seconds: number, decay: number): AudioBuffer {
    const len = Math.ceil(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const k = i / len;
        // primeras reflexiones más densas y luego cola difusa
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - k, decay) * (i < ctx.sampleRate * 0.08 ? 1.4 : 1);
      }
    }
    return buf;
  }
}
