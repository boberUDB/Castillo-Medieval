import { Lighting, type Light } from './lighting';
import { P } from './palette';
import { px, rect, type Ctx } from './pixel';
import { computeViewport, type Viewport } from './viewport';
import { Exterior } from '../world/exterior';
import { GROUND, overlaps } from '../world/layout';
import { sparkle } from '../world/props';
import { Shell } from '../world/shell';
import { InteriorSky } from '../world/sky';
import { Timeline, type CamState, type Seg } from '../world/timeline';
import type { FxState, HotspotDef, Rect, RoomId, SpaceDef } from '../world/types';

export interface EngineView {
  room: RoomId;
  scene: 'ext' | 'int';
  /** La sala está en reposo y su texto puede leerse. */
  caption: boolean;
  /** Título del exterior visible. */
  title: boolean;
}

export interface EngineOptions {
  spaces: SpaceDef[];
  segments: (reduced: boolean) => Seg[];
  reduced: boolean;
  flag: (id: string) => boolean;
  onView: (v: EngineView) => void;
  onQuality?: (q: 'high' | 'low') => void;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Mide la altura "grande" del viewport (100lvh) para que la barra del navegador móvil no reescale nada. */
function stableHeight(): number {
  const probe = document.getElementById('lvh-probe');
  const h = probe?.getBoundingClientRect().height ?? 0;
  return h > 0 ? h : window.innerHeight;
}

export class Engine {
  private ctx: Ctx;
  private vp: Viewport;
  private lighting: Lighting;
  private shell = new Shell();
  private sky = new InteriorSky();
  private exterior = new Exterior();
  private baked = new Map<string, HTMLCanvasElement>();
  private timeline: Timeline;
  private progress = 0;
  private raf = 0;
  private last = 0;
  private fxTimes = new Map<string, number>();
  private hotspotEls = new Map<string, HTMLElement>();
  private hotspotShown = new Map<string, boolean>();
  private defs = new Map<string, { def: HotspotDef; space: SpaceDef }>();
  private view: EngineView | null = null;
  private lastSeg = -1;
  private lastScene: 'ext' | 'int' = 'ext';
  private curtain = { until: 0, dur: 1 };
  private reduced: boolean;
  private quality: 'high' | 'low' = 'high';
  private slowFrames = 0;
  private cam: CamState | null = null;
  private stableH = 0;
  hovered: string | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    private track: HTMLElement,
    private opts: EngineOptions,
  ) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.reduced = opts.reduced;
    this.timeline = new Timeline(opts.segments(this.reduced));
    for (const space of opts.spaces) for (const def of space.hotspots ?? []) this.defs.set(def.id, { def, space });
    this.vp = computeViewport();
    this.lighting = new Lighting(this.vp.w, this.vp.h);
    this.resize();
    window.addEventListener('resize', this.onResize);
    window.addEventListener('pointermove', this.onPointer, { passive: true });
    document.documentElement.addEventListener('pointerleave', this.onPointerOut);
  }

  /* ------------------------------ API ------------------------------ */

  start(): void {
    this.last = performance.now();
    this.progress = window.scrollY / this.stableH;
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      this.frame(now);
    };
    this.raf = requestAnimationFrame(loop);
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('pointermove', this.onPointer);
    document.documentElement.removeEventListener('pointerleave', this.onPointerOut);
    this.hotspotEls.clear();
  }

  registerHotspot(id: string, el: HTMLElement | null): void {
    if (el) this.hotspotEls.set(id, el);
    else this.hotspotEls.delete(id);
    this.hotspotShown.delete(id);
  }

  trigger(id: string): void {
    this.fxTimes.set(id, performance.now() / 1000);
  }

  setReduced(reduced: boolean): void {
    if (reduced === this.reduced) return;
    const room = this.view?.room ?? 'exterior';
    this.reduced = reduced;
    this.timeline = new Timeline(this.opts.segments(reduced));
    this.resize();
    this.goTo(room, true);
  }

  setQuality(q: 'high' | 'low'): void {
    if (q === this.quality) return;
    this.quality = q;
    this.slowFrames = 0;
    this.resize();
    this.opts.onQuality?.(q);
  }

  getQuality(): 'high' | 'low' {
    return this.quality;
  }

  /** Posición de scroll (px) donde reposa una sala. */
  scrollFor(room: RoomId): number | null {
    const stop = this.timeline.stops().find((s) => s.room === room);
    return stop ? Math.round(stop.at * this.stableH) : null;
  }

  goTo(room: RoomId, instant = false): void {
    const y = this.scrollFor(room);
    if (y === null) return;
    window.scrollTo({ top: y, behavior: instant || this.reduced ? 'auto' : 'smooth' });
    if (instant) this.progress = y / this.stableH;
  }

  /* ------------------------------ tamaño ------------------------------ */

  private onResize = () => this.resize();

  private resize(): void {
    const prevH = this.stableH;
    const progress = prevH ? window.scrollY / prevH : 0;
    this.vp = computeViewport();
    if (this.quality === 'low') {
      // calidad baja: píxeles más grandes (menos superficie que dibujar)
      this.vp.scale += 1;
      this.vp.w = Math.ceil((this.vp.cssW * this.vp.dpr) / this.vp.scale);
      this.vp.h = Math.ceil((this.vp.cssH * this.vp.dpr) / this.vp.scale);
      this.vp.cssPerPx = this.vp.scale / this.vp.dpr;
    }
    const { w, h, cssPerPx } = this.vp;
    this.canvas.width = w;
    this.canvas.height = h;
    this.canvas.style.width = `${w * cssPerPx}px`;
    this.canvas.style.height = `${h * cssPerPx}px`;
    this.ctx.imageSmoothingEnabled = false;
    this.lighting.resize(w, h);
    // la cartela mide ~150 px CSS en móvil y ~140 en escritorio
    this.timeline.floorPad = Math.ceil((this.vp.portrait ? 150 : 140) / cssPerPx);
    this.stableH = Math.max(stableHeight(), this.vp.cssH);
    this.track.style.height = `${Math.round(this.timeline.total * this.stableH + this.stableH)}px`;
    if (prevH && Math.abs(prevH - this.stableH) > 1) {
      window.scrollTo({ top: progress * this.stableH, behavior: 'auto' });
      this.progress = progress;
    }
  }

  /* ------------------------------ efectos ------------------------------ */

  private fx(t: number, cam: CamState): FxState {
    let pointer: FxState['pointer'] = null;
    if (this.pointer && cam.scene === 'int') {
      const { w, h, cssPerPx } = this.vp;
      pointer = {
        x: Math.round(cam.cx - w / 2) + this.pointer.x / cssPerPx,
        y: Math.round(cam.cy - h / 2) + this.pointer.y / cssPerPx,
      };
    }
    return {
      since: (id: string) => this.fxTimes.get(id) ?? t - 1e6,
      flag: this.opts.flag,
      hovered: this.hovered,
      pointer,
      cam: { x: cam.cx, y: cam.cy },
      quality: this.quality,
      reduced: this.reduced,
    };
  }

  private pointer: { x: number; y: number } | null = null;
  private onPointer = (e: PointerEvent) => {
    this.pointer = e.pointerType === 'mouse' || e.pointerType === 'pen' ? { x: e.clientX, y: e.clientY } : null;
  };
  private onPointerOut = () => {
    this.pointer = null;
  };

  /* ------------------------------ fotograma ------------------------------ */

  private frame(nowMs: number): void {
    const dt = Math.min(0.1, (nowMs - this.last) / 1000);
    this.last = nowMs;
    const t = nowMs / 1000;

    // progreso: scroll nativo suavizado (sin suavizar en movimiento reducido)
    const target = window.scrollY / this.stableH;
    if (this.reduced) this.progress = target;
    else {
      this.progress += (target - this.progress) * (1 - Math.exp(-dt * 8));
      if (Math.abs(target - this.progress) < 0.0004) this.progress = target;
    }

    const { w, h } = this.vp;
    const cam = this.timeline.evaluate(this.progress, w, h);
    this.cam = cam;
    const fx = this.fx(t, cam);

    // cortes: al entrar al castillo y (en movimiento reducido) entre salas
    if (cam.scene !== this.lastScene) this.curtain = { until: t + 0.7, dur: 0.7 };
    else if (this.reduced && cam.seg !== this.lastSeg && this.lastSeg !== -1) this.curtain = { until: t + 0.28, dur: 0.28 };
    this.lastScene = cam.scene;
    this.lastSeg = cam.seg;

    if (cam.scene === 'ext') this.renderExterior(cam, t, fx);
    else this.renderInterior(cam, t, fx);

    if (t < this.curtain.until) {
      this.ctx.globalAlpha = clamp((this.curtain.until - t) / this.curtain.dur, 0, 1);
      rect(this.ctx, 0, 0, w, h, P.black);
      this.ctx.globalAlpha = 1;
    }

    this.emitView(cam);
    this.watchPerformance(dt);
  }

  private watchPerformance(dt: number): void {
    if (this.quality === 'low' || document.hidden) return;
    // más de ~2 s acumulados por debajo de 40 fps: bajamos la calidad
    if (dt > 0.025 && dt < 0.1) this.slowFrames++;
    else this.slowFrames = Math.max(0, this.slowFrames - 0.5);
    if (this.slowFrames > 90) this.setQuality('low');
  }

  private emitView(cam: CamState): void {
    const caption = cam.scene === 'int' && cam.dwell && cam.local > 0.04 && cam.local < 0.96;
    const title = cam.scene === 'ext' && cam.e < 0.1;
    const v: EngineView = { room: cam.room, scene: cam.scene, caption, title };
    const p = this.view;
    if (!p || p.room !== v.room || p.scene !== v.scene || p.caption !== v.caption || p.title !== v.title) {
      this.view = v;
      this.opts.onView(v);
    }
  }

  /* ------------------------------ exterior ------------------------------ */

  private renderExterior(cam: CamState, t: number, fx: FxState): void {
    const { w, h, cssPerPx } = this.vp;
    this.exterior.render(this.ctx, w, h, cam.e, t, fx);
    const spots = this.exterior.hotspots();
    const seen = new Set<string>();
    for (const s of spots) {
      seen.add(s.id);
      const onScreen = s.visible && s.x + s.w > 0 && s.y + s.h > 0 && s.x < w && s.y < h;
      if (onScreen) {
        if (this.hovered === s.id) this.brackets(s.x, s.y, s.w, s.h, t);
        else if (!fx.flag(`done:${s.id}`) && s.id !== 'ext.raven') sparkle(this.ctx, s.x + s.w - 2, s.y + 2, t, s.x);
      }
      this.placeHotspot(s.id, onScreen, s.x * cssPerPx, s.y * cssPerPx, s.w * cssPerPx, s.h * cssPerPx);
    }
    for (const id of this.hotspotEls.keys()) if (!seen.has(id)) this.placeHotspot(id, false, 0, 0, 0, 0);
  }

  /* ------------------------------ interior ------------------------------ */

  private renderInterior(cam: CamState, t: number, fx: FxState): void {
    const ctx = this.ctx;
    const { w, h, cssPerPx } = this.vp;
    const camX = Math.round(cam.cx - w / 2);
    const camY = Math.round(cam.cy - h / 2);
    const viewRect: Rect = { x: camX, y: camY, w, h };
    const near: Rect = { x: camX - 64, y: camY - 64, w: w + 128, h: h + 128 };

    this.sky.draw(ctx, camX, camY, w, h, this.reduced ? 0 : t, GROUND);
    this.shell.draw(ctx, camX, camY, w, h);

    const visible = this.opts.spaces.filter((s) => overlaps(s.bounds, near));
    for (const s of visible) {
      const img = this.bake(s);
      ctx.drawImage(img, s.bounds.x - camX, s.bounds.y - camY);
    }
    ctx.save();
    ctx.translate(-camX, -camY);
    for (const s of visible) s.draw?.(ctx, t, fx);
    ctx.restore();

    // luz: cada sala tiene su oscuridad ambiente y se revela al acercarse la cámara
    const zones = visible.map((s) => {
      const r = s.interior;
      const dx = Math.max(r.x - cam.cx, 0, cam.cx - (r.x + r.w));
      const dy = Math.max(r.y - cam.cy, 0, cam.cy - (r.y + r.h));
      const reveal = clamp(1 - Math.hypot(dx, dy) / 180, 0, 1);
      const a = 0.9 + (s.ambient - 0.9) * reveal;
      return { x: r.x - camX, y: r.y - camY, w: r.w, h: r.h, a };
    });
    const lights: Light[] = [];
    for (const s of visible) if (s.lights) lights.push(...s.lights(t, fx));
    this.lighting.render(ctx, zones, 0.3, lights, camX, camY, this.reduced ? 0 : t, this.quality === 'high' ? 1 : 0);

    // indicaciones de objetos interactivos y hotspots HTML
    const seen = new Set<string>();
    for (const s of visible) {
      for (const d of s.hotspots ?? []) {
        seen.add(d.id);
        const sx = d.x - camX;
        const sy = d.y - camY;
        const on = overlaps(d, viewRect);
        if (on) {
          if (this.hovered === d.id) this.brackets(sx, sy, d.w, d.h, t);
          else if (d.kind !== 'secret' && !fx.flag(`done:${d.id}`)) sparkle(ctx, sx + d.w - 1, sy + 1, t, d.x * 0.1, d.kind === 'main');
        }
        this.placeHotspot(d.id, on, sx * cssPerPx, sy * cssPerPx, d.w * cssPerPx, d.h * cssPerPx);
      }
    }
    for (const id of this.hotspotEls.keys()) if (!seen.has(id)) this.placeHotspot(id, false, 0, 0, 0, 0);

    for (const s of visible) s.fore?.(ctx, cam.cx, cam.cy, w, h, this.reduced ? 0 : t);

    // carga progresiva de lo que viene: teselas y salas cercanas
    this.shell.prefetch(cam.cx, cam.cy, 420);
    const upcoming = this.opts.spaces.find((s) => !this.baked.has(s.id) && overlaps(s.bounds, { x: camX - 500, y: camY - 400, w: w + 1000, h: h + 800 }));
    if (upcoming) this.bake(upcoming);
  }

  /** Esquinas doradas alrededor del objeto enfocado o señalado. */
  private brackets(x: number, y: number, w: number, h: number, t: number): void {
    const ctx = this.ctx;
    const o = Math.round((Math.sin(t * 6) + 1) * 0.75);
    const x0 = Math.round(x) - 2 - o;
    const y0 = Math.round(y) - 2 - o;
    const x1 = Math.round(x + w) + 1 + o;
    const y1 = Math.round(y + h) + 1 + o;
    const c = P.gold3;
    for (const [cx, cy, dx, dy] of [
      [x0, y0, 1, 1],
      [x1, y0, -1, 1],
      [x0, y1, 1, -1],
      [x1, y1, -1, -1],
    ]) {
      rect(ctx, Math.min(cx, cx + dx * 3), cy, 4, 1, c);
      rect(ctx, cx, Math.min(cy, cy + dy * 3), 1, 4, c);
      px(ctx, cx + dx, cy + dy, P.gold4);
    }
  }

  private placeHotspot(id: string, on: boolean, x: number, y: number, w: number, h: number): void {
    const el = this.hotspotEls.get(id);
    if (!el) return;
    if (this.hotspotShown.get(id) !== on) {
      this.hotspotShown.set(id, on);
      el.hidden = !on;
      if (!on && document.activeElement === el) (document.activeElement as HTMLElement).blur();
    }
    if (!on) return;
    // mínimo táctil de 44 px, centrado sobre el objeto
    const mw = Math.max(44, w);
    const mh = Math.max(44, h);
    el.style.transform = `translate3d(${Math.round(x - (mw - w) / 2)}px, ${Math.round(y - (mh - h) / 2)}px, 0)`;
    el.style.width = `${Math.round(mw)}px`;
    el.style.height = `${Math.round(mh)}px`;
  }

  private bake(s: SpaceDef): HTMLCanvasElement {
    let img = this.baked.get(s.id);
    if (img) return img;
    img = document.createElement('canvas');
    img.width = s.bounds.w;
    img.height = s.bounds.h;
    const c = img.getContext('2d')!;
    c.imageSmoothingEnabled = false;
    c.translate(-s.bounds.x, -s.bounds.y);
    s.bake(c);
    this.baked.set(s.id, img);
    return img;
  }

  /** Estado de cámara actual (para depuración y pruebas). */
  debug(): { cam: CamState | null; progress: number; vp: Viewport; quality: string } {
    return { cam: this.cam, progress: this.progress, vp: this.vp, quality: this.quality };
  }
}
