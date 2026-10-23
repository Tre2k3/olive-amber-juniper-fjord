/**
 * Fully synthesized audio for game-v2. No files, no licensing, ~0 bytes of
 * assets. Everything is oscillators and one noise buffer.
 *
 * Browsers refuse to start audio without a gesture, so `unlock()` is called
 * from the first key or pointer event rather than on load.
 */

export type Sfx =
  // court
  | "swish"
  | "net"
  | "rim"
  | "backboard"
  | "pole"
  | "bounce"
  | "pickup"
  | "release"
  | "heat"
  | "buzzer"
  | "bowlRelease"
  | "engine"
  | "drift"
  | "countdown"
  | "bowlRoll"
  | "pins"
  | "strike"
  | "spare"
  | "gutter"
  | "foul"
  | "whistle"
  // river
  | "cast"
  | "splash"
  | "nibble"
  | "bite"
  | "reel"
  | "strain"
  | "snap"
  | "landed"
  // haunt
  | "creak"
  | "whisper"
  | "sting"
  | "heartbeat"
  | "flicker"
  | "jersey"
  | "doorlock"
  | "cleared"
  // general
  | "cash"
  | "denied"
  | "ui"
  | "step"
  | "complete";

const MIX_KEY = "sack-v2-mix";

type Mix = { master: number; music: number; muted: boolean };

function note(semitonesFromA4: number) {
  return 440 * Math.pow(2, semitonesFromA4 / 12);
}

export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  private music: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private mix: Mix = { master: 0.7, music: 0.45, muted: false };
  private lastAt: Partial<Record<Sfx, number>> = {};
  private musicOn = false;
  private timer: number | null = null;
  private step = 0;
  private nextStep = 0;
  private readonly stepDur = 60 / 84 / 2;
  /** Haunt: the bed switches to a darker pattern. */
  mood: "street" | "haunt" | "off" = "street";
  private heartbeatT = 0;

  constructor() {
    try {
      const raw = localStorage.getItem(MIX_KEY);
      if (raw) {
        const m = JSON.parse(raw) as Partial<Mix>;
        this.mix = {
          master: clamp01(m.master ?? 0.7),
          music: clamp01(m.music ?? 0.45),
          muted: !!m.muted,
        };
      }
    } catch {
      /* defaults */
    }
  }

  get settings(): Mix {
    return { ...this.mix };
  }

  unlock() {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      try {
        this.ctx = new Ctor();
      } catch {
        return;
      }
      this.master = this.ctx.createGain();
      this.sfx = this.ctx.createGain();
      this.music = this.ctx.createGain();
      this.sfx.connect(this.master);
      this.music.connect(this.master);
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -12;
      comp.ratio.value = 6;
      this.master.connect(comp);
      comp.connect(this.ctx.destination);
      const len = Math.floor(this.ctx.sampleRate);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;
      this.apply();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  private apply() {
    if (!this.ctx || !this.master || !this.music || !this.sfx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.mix.muted ? 0 : this.mix.master, t, 0.02);
    this.music.gain.setTargetAtTime(this.mix.music * 0.5, t, 0.02);
    this.sfx.gain.setTargetAtTime(0.9, t, 0.02);
  }

  private save() {
    try {
      localStorage.setItem(MIX_KEY, JSON.stringify(this.mix));
    } catch {
      /* ignore */
    }
  }

  setMaster(v: number) {
    this.mix.master = clamp01(v);
    this.apply();
    this.save();
  }

  setMusic(v: number) {
    this.mix.music = clamp01(v);
    this.apply();
    this.save();
  }

  toggleMuted() {
    this.mix.muted = !this.mix.muted;
    this.apply();
    this.save();
    return this.mix.muted;
  }

  suspend() {
    if (this.ctx?.state === "running") void this.ctx.suspend();
  }

  resume() {
    if (this.ctx?.state === "suspended") void this.ctx.resume();
  }

  // ------------------------------------------------------------- primitives

  private tone(o: {
    f: number;
    type?: OscillatorType;
    dur: number;
    vol?: number;
    to?: number;
    delay?: number;
    attack?: number;
    detune?: number;
    bus?: GainNode | null;
    at?: number;
  }) {
    const ctx = this.ctx;
    const bus = o.bus ?? this.sfx;
    if (!ctx || !bus) return;
    const t0 = (o.at ?? ctx.currentTime) + (o.delay ?? 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type ?? "sine";
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.to !== undefined)
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t0 + o.dur);
    if (o.detune) osc.detune.value = o.detune;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.vol ?? 0.2, t0 + (o.attack ?? 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    osc.connect(g);
    g.connect(bus);
    osc.start(t0);
    osc.stop(t0 + o.dur + 0.03);
  }

  private hiss(o: {
    dur: number;
    vol?: number;
    f?: number;
    to?: number;
    q?: number;
    type?: BiquadFilterType;
    delay?: number;
    bus?: GainNode | null;
    at?: number;
  }) {
    const ctx = this.ctx;
    const bus = o.bus ?? this.sfx;
    if (!ctx || !bus || !this.noise) return;
    const t0 = (o.at ?? ctx.currentTime) + (o.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = o.type ?? "bandpass";
    f.frequency.setValueAtTime(o.f ?? 1200, t0);
    if (o.to !== undefined)
      f.frequency.exponentialRampToValueAtTime(Math.max(40, o.to), t0 + o.dur);
    f.Q.value = o.q ?? 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.vol ?? 0.2, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    src.connect(f);
    f.connect(g);
    g.connect(bus);
    src.start(t0);
    src.stop(t0 + o.dur + 0.03);
  }

  // ---------------------------------------------------------------- effects

  play(name: Sfx, v = 0) {
    if (!this.ctx || this.mix.muted) return;
    const now = this.ctx.currentTime;
    const gate: Partial<Record<Sfx, number>> = {
      bounce: 0.06,
      step: 0.14,
      reel: 0.09,
      nibble: 0.3,
      flicker: 0.12,
      strain: 0.2,
      bowlRoll: 0.22,
      engine: 0.16,
      drift: 0.14,
    };
    const g = gate[name];
    if (g !== undefined) {
      if (now - (this.lastAt[name] ?? -1) < g) return;
      this.lastAt[name] = now;
    }
    switch (name) {
      case "swish":
        this.hiss({ dur: 0.24, vol: 0.18, f: 3600, to: 800, q: 1.1 });
        this.tone({ f: note(19), dur: 0.32, vol: 0.09, delay: 0.02 });
        break;
      case "net":
        this.hiss({ dur: 0.18, vol: 0.12, f: 2400, to: 700 });
        break;
      case "rim":
        this.tone({ f: 760, type: "square", dur: 0.1, vol: 0.07, to: 540 });
        this.hiss({ dur: 0.12, vol: 0.07, f: 2600, q: 6 });
        break;
      case "backboard":
        this.tone({ f: 170, type: "triangle", dur: 0.24, vol: 0.13, to: 110 });
        this.hiss({ dur: 0.1, vol: 0.06, f: 700, q: 2 });
        break;
      case "pole":
        this.tone({ f: 420, type: "triangle", dur: 0.3, vol: 0.08, to: 300 });
        break;
      case "bounce":
        this.tone({ f: 112 + v * 40, dur: 0.12, vol: 0.09 + v * 0.05, to: 72 });
        break;
      case "engine":
        // V8 idle to redline: a sawtooth whose pitch and bite follow speed (v 0..1), retriggered while driving.
        this.tone({
          f: 52 + v * 160,
          type: "sawtooth",
          dur: 0.2,
          vol: 0.035 + v * 0.03,
          to: 50 + v * 165,
          attack: 0.02,
        });
        this.tone({
          f: 104 + v * 320,
          type: "square",
          dur: 0.2,
          vol: 0.012 + v * 0.015,
          attack: 0.02,
        });
        break;
      case "drift":
        this.hiss({ dur: 0.2, vol: 0.06 + v * 0.05, f: 1800, to: 900, q: 2.5, type: "bandpass" });
        break;
      case "countdown":
        this.tone({
          f: v >= 1 ? 1047 : 660,
          type: "square",
          dur: v >= 1 ? 0.5 : 0.14,
          vol: 0.09,
          attack: 0.004,
        });
        break;
      case "bowlRelease":
        // Sixteen pounds meeting maple: a low thump with a short lane rattle.
        this.tone({ f: 70, dur: 0.22, vol: 0.16, to: 46 });
        this.hiss({ dur: 0.08, vol: 0.05, f: 700, to: 300 });
        break;
      case "bowlRoll":
        // Rolling rumble, retriggered while the ball travels; v is speed 0..1.
        this.hiss({
          dur: 0.26,
          vol: 0.03 + v * 0.05,
          f: 180 + v * 120,
          to: 160,
          q: 1.2,
          type: "lowpass",
        });
        break;
      case "pins": {
        // Maple clatter: a burst of short knocks spread over ~0.3 s, more of them for more pins (v 0..1).
        const n = 3 + Math.round(v * 9);
        for (let i = 0; i < n; i++) {
          const at = i * (0.03 + Math.random() * 0.02);
          this.tone({
            f: 420 + Math.random() * 500,
            type: "square",
            dur: 0.05,
            vol: 0.05 + v * 0.03,
            to: 220,
            delay: at,
            attack: 0.002,
          });
          this.hiss({ dur: 0.07, vol: 0.04, f: 2200 + Math.random() * 1500, to: 900, delay: at });
        }
        this.tone({ f: 90, dur: 0.3, vol: 0.12 + v * 0.06, to: 55 });
        break;
      }
      case "strike":
        this.tone({ f: 523, dur: 0.1, vol: 0.09, attack: 0.005 });
        this.tone({ f: 659, dur: 0.1, vol: 0.09, delay: 0.1, attack: 0.005 });
        this.tone({ f: 784, dur: 0.12, vol: 0.1, delay: 0.2, attack: 0.005 });
        this.tone({ f: 1047, dur: 0.45, vol: 0.12, delay: 0.32, attack: 0.01 });
        break;
      case "spare":
        this.tone({ f: 587, dur: 0.1, vol: 0.09, attack: 0.005 });
        this.tone({ f: 880, dur: 0.4, vol: 0.11, delay: 0.12, attack: 0.01 });
        break;
      case "gutter":
        this.tone({ f: 60, dur: 0.3, vol: 0.14, to: 40 });
        this.hiss({ dur: 0.35, vol: 0.04, f: 300, to: 120, type: "lowpass" });
        break;
      case "foul":
        this.tone({ f: 220, type: "square", dur: 0.18, vol: 0.07 });
        this.tone({ f: 220, type: "square", dur: 0.28, vol: 0.07, delay: 0.24 });
        break;
      case "pickup":
        this.hiss({ dur: 0.08, vol: 0.05, f: 900 });
        break;
      case "release":
        this.hiss({ dur: 0.14, vol: 0.05, f: 1500, to: 400 });
        break;
      case "heat":
        [0, 4, 7, 12].forEach((s, i) =>
          this.tone({ f: note(9 + s), type: "triangle", dur: 0.45, vol: 0.1, delay: i * 0.07 }),
        );
        break;
      case "buzzer":
        this.tone({ f: 180, type: "sawtooth", dur: 0.9, vol: 0.12 });
        this.tone({ f: 184, type: "square", dur: 0.9, vol: 0.06 });
        break;
      case "whistle":
        this.tone({ f: 2100, dur: 0.5, vol: 0.08, to: 2400 });
        this.tone({ f: 2650, dur: 0.5, vol: 0.04, detune: 12 });
        break;

      case "cast":
        this.hiss({ dur: 0.42, vol: 0.07, f: 600, to: 3200, q: 0.8 });
        break;
      case "splash":
        this.hiss({ dur: 0.36, vol: 0.16, f: 1800, to: 300, q: 0.7 });
        this.tone({ f: 160, dur: 0.2, vol: 0.06, to: 60 });
        break;
      case "nibble":
        this.tone({ f: 420, dur: 0.05, vol: 0.05, to: 300 });
        break;
      case "bite":
        this.tone({ f: 260, type: "triangle", dur: 0.18, vol: 0.14, to: 120 });
        this.hiss({ dur: 0.2, vol: 0.09, f: 1200, to: 400 });
        break;
      case "reel":
        this.tone({ f: 1800 + v * 600, type: "square", dur: 0.03, vol: 0.025 });
        break;
      case "strain":
        this.tone({
          f: 90 + v * 160,
          type: "sawtooth",
          dur: 0.22,
          vol: 0.05 + v * 0.06,
          to: 80 + v * 200,
        });
        break;
      case "snap":
        this.tone({ f: 2200, type: "square", dur: 0.06, vol: 0.12, to: 400 });
        this.hiss({ dur: 0.3, vol: 0.1, f: 500, to: 120 });
        break;
      case "landed":
        [0, 7, 12].forEach((s, i) =>
          this.tone({ f: note(2 + s), type: "triangle", dur: 0.4, vol: 0.1, delay: i * 0.08 }),
        );
        this.hiss({ dur: 0.25, vol: 0.08, f: 1500, to: 400 });
        break;

      case "creak":
        this.tone({ f: 180, type: "sawtooth", dur: 0.7, vol: 0.05, to: 120, attack: 0.2 });
        this.tone({ f: 367, type: "sawtooth", dur: 0.7, vol: 0.02, to: 240, attack: 0.3 });
        break;
      case "whisper":
        this.hiss({ dur: 1.4, vol: 0.06, f: 1800, to: 2600, q: 0.6, type: "bandpass" });
        this.hiss({ dur: 1.4, vol: 0.04, f: 900, to: 500, q: 1.2, delay: 0.3 });
        break;
      case "sting":
        this.tone({ f: note(-10), type: "sawtooth", dur: 0.55, vol: 0.16, to: note(-22) });
        this.tone({ f: note(-9.5), type: "sawtooth", dur: 0.55, vol: 0.1, to: note(-21) });
        this.hiss({ dur: 0.5, vol: 0.14, f: 300, to: 3000, q: 0.5 });
        break;
      case "heartbeat":
        this.tone({ f: 58, dur: 0.16, vol: 0.2 + v * 0.15, to: 36 });
        this.tone({ f: 54, dur: 0.14, vol: 0.14 + v * 0.1, to: 34, delay: 0.22 });
        break;
      case "flicker":
        this.hiss({ dur: 0.05, vol: 0.05, f: 4000, q: 4 });
        break;
      case "jersey":
        [0, 3, 7, 10].forEach((s, i) =>
          this.tone({ f: note(0 + s), type: "triangle", dur: 0.5, vol: 0.1, delay: i * 0.06 }),
        );
        break;
      case "doorlock":
        this.tone({ f: 120, type: "square", dur: 0.12, vol: 0.1 });
        this.tone({ f: 90, type: "square", dur: 0.18, vol: 0.1, delay: 0.14 });
        break;
      case "cleared":
        [0, 4, 7, 12, 16, 19].forEach((s, i) =>
          this.tone({ f: note(-3 + s), type: "triangle", dur: 0.6, vol: 0.11, delay: i * 0.07 }),
        );
        break;

      case "cash":
        this.tone({ f: note(16), type: "triangle", dur: 0.34, vol: 0.15 });
        this.tone({ f: note(23), type: "triangle", dur: 0.42, vol: 0.1, delay: 0.06 });
        this.hiss({ dur: 0.3, vol: 0.05, f: 5200, to: 2600, q: 3 });
        break;
      case "denied":
        this.tone({ f: note(-2), type: "sawtooth", dur: 0.16, vol: 0.1, to: note(-9) });
        break;
      case "ui":
        this.tone({ f: note(12), type: "square", dur: 0.045, vol: 0.05 });
        break;
      case "step":
        this.hiss({ dur: 0.08, vol: 0.04, f: 400 + v * 260, q: 1.4 });
        break;
      case "complete":
        [0, 7, 12].forEach((s, i) =>
          this.tone({ f: note(-8 + s), type: "sawtooth", dur: 0.7, vol: 0.07, delay: i * 0.1 }),
        );
        this.hiss({ dur: 0.8, vol: 0.05, f: 800, to: 5000, q: 0.8 });
        break;
    }
  }

  /** Slow pulse used inside the haunt; rate rises as nerve drops. */
  tickHeartbeat(dt: number, intensity: number) {
    if (this.mood !== "haunt" || !this.ctx) return;
    this.heartbeatT -= dt;
    if (this.heartbeatT <= 0) {
      this.heartbeatT = 1.25 - intensity * 0.7;
      this.play("heartbeat", intensity);
    }
  }

  // ------------------------------------------------------------------ music

  setMusicEnabled(on: boolean) {
    if (on === this.musicOn) return;
    this.musicOn = on;
    if (on) {
      if (!this.ctx) {
        this.musicOn = false;
        return;
      }
      this.step = 0;
      this.nextStep = this.ctx.currentTime + 0.1;
      this.timer = window.setInterval(() => this.schedule(), 40);
    } else if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  private schedule() {
    const ctx = this.ctx;
    if (!ctx || !this.musicOn || this.mood === "off") return;
    while (this.nextStep < ctx.currentTime + 0.15) {
      if (this.mood === "haunt") this.hauntStep(this.step, this.nextStep);
      else this.streetStep(this.step, this.nextStep);
      this.nextStep += this.stepDur;
      this.step = (this.step + 1) % 32;
    }
  }

  private streetStep(step: number, t: number) {
    const ROOT = -16; // F2
    const BASS = [0, 0, 3, 0, 5, 3, 0, -2];
    const CHORD = [0, 3, 7, 10];
    const bar = Math.floor(step / 8) % 4;
    const inBar = step % 8;
    const bus = this.music;
    if (inBar === 0 || inBar === 3 || (inBar === 6 && bar % 2 === 1))
      this.tone({ f: 62, dur: 0.34, vol: 0.5, to: 38, bus, at: t });
    if (inBar % 2 === 1)
      this.hiss({ dur: 0.05, vol: inBar === 5 ? 0.1 : 0.05, f: 8000, q: 2, bus, at: t });
    if (inBar === 4) this.hiss({ dur: 0.15, vol: 0.12, f: 1800, to: 700, q: 1.2, bus, at: t });
    if (inBar % 2 === 0)
      this.tone({
        f: note(ROOT + (BASS[inBar] ?? 0) + (bar === 3 ? -2 : 0)),
        type: "triangle",
        dur: this.stepDur * 1.7,
        vol: 0.3,
        bus,
        at: t,
      });
    if (step >= 16 && inBar % 4 === 2)
      this.tone({
        f: note(ROOT + 24 + (CHORD[(step / 2) % 4] ?? 0)),
        dur: 0.8,
        vol: 0.1,
        bus,
        at: t,
      });
    if (step === 0)
      CHORD.forEach((s, i) =>
        this.tone({
          f: note(ROOT + 12 + s),
          type: "sawtooth",
          dur: this.stepDur * 30,
          vol: 0.035,
          attack: 1.2,
          delay: i * 0.01,
          bus,
          at: t,
        }),
      );
  }

  private hauntStep(step: number, t: number) {
    const bus = this.music;
    const inBar = step % 8;
    // Low drone, a slow minor-second rub, and sparse ticks. No groove — it should feel wrong.
    if (step % 16 === 0) {
      this.tone({
        f: note(-33),
        type: "sawtooth",
        dur: this.stepDur * 16,
        vol: 0.09,
        attack: 1.5,
        bus,
        at: t,
      });
      this.tone({
        f: note(-32),
        type: "sawtooth",
        dur: this.stepDur * 16,
        vol: 0.05,
        attack: 2.2,
        bus,
        at: t,
      });
    }
    if (inBar === 3 && Math.random() < 0.5)
      this.hiss({ dur: 0.08, vol: 0.05, f: 3000, q: 5, bus, at: t });
    if (step % 32 === 20)
      this.tone({ f: note(-9), dur: 1.2, vol: 0.05, to: note(-10), attack: 0.3, bus, at: t });
  }

  dispose() {
    this.setMusicEnabled(false);
    if (this.ctx) void this.ctx.close();
    this.ctx = null;
  }
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}
