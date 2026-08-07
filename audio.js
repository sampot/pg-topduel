/**
 * Top duel SFX — charge, launch, clash, win/lose via Web Audio.
 */

export class TopDuelAudio {
  constructor() {
    /** @type {AudioContext | null} */
    this.ctx = null;
    this.enabled = true;
    this.master = 0.28;
    /** @type {OscillatorNode | null} */
    this.spinOsc = null;
    /** @type {GainNode | null} */
    this.spinGain = null;
  }

  async unlock() {
    this.ensure();
    if (this.ctx?.state === "suspended") await this.ctx.resume();
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
  }

  setEnabled(on) {
    this.enabled = on;
    if (!on) this.stopSpin();
  }

  /**
   * @param {number} freq
   * @param {number} dur
   * @param {OscillatorType} [type]
   * @param {number} [gain]
   * @param {number} [when]
   * @param {number} [slideTo]
   */
  tone(freq, dur, type = "sine", gain = 0.12, when = 0, slideTo = 0) {
    if (!this.enabled) return;
    this.ensure();
    const ctx = this.ctx;
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), t0);
    if (slideTo > 0) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain * this.master, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(0.04, dur));
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  /**
   * @param {number} dur
   * @param {number} [gain]
   * @param {number} [when]
   * @param {number} [filterFreq]
   */
  noise(dur, gain = 0.1, when = 0, filterFreq = 900) {
    if (!this.enabled) return;
    this.ensure();
    const ctx = this.ctx;
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = "bandpass";
    filt.frequency.value = filterFreq;
    filt.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain * this.master, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(ctx.destination);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  click() {
    this.tone(620, 0.05, "triangle", 0.08);
  }

  chargeTick() {
    this.tone(180 + Math.random() * 40, 0.03, "sine", 0.04);
  }

  launch() {
    this.noise(0.12, 0.14, 0, 600);
    this.tone(120, 0.18, "sawtooth", 0.1, 0, 420);
  }

  enemyLaunch() {
    this.noise(0.1, 0.11, 0, 520);
    this.tone(100, 0.16, "sawtooth", 0.08, 0, 380);
  }

  hit() {
    this.noise(0.07, 0.16, 0, 1200);
    this.tone(280, 0.08, "square", 0.09, 0, 140);
  }

  /**
   * @param {number} rpm
   */
  setSpin(rpm) {
    if (!this.enabled || rpm < 80) {
      this.stopSpin();
      return;
    }
    this.ensure();
    const ctx = this.ctx;
    if (!ctx) return;
    const freq = 60 + (rpm / 1500) * 220;
    if (!this.spinOsc) {
      this.spinOsc = ctx.createOscillator();
      this.spinGain = ctx.createGain();
      this.spinOsc.type = "sine";
      this.spinOsc.connect(this.spinGain);
      this.spinGain.connect(ctx.destination);
      this.spinOsc.start();
      this.spinGain.gain.value = 0.0001;
    }
    this.spinOsc.frequency.setTargetAtTime(freq, ctx.currentTime, 0.05);
    const g = (rpm / 1500) * 0.06 * this.master;
    this.spinGain.gain.setTargetAtTime(g, ctx.currentTime, 0.08);
  }

  stopSpin() {
    if (this.spinGain && this.ctx) {
      this.spinGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.05);
    }
  }

  roundWin() {
    this.tone(440, 0.12, "triangle", 0.1);
    this.tone(660, 0.18, "triangle", 0.1, 0.1);
  }

  roundLose() {
    this.tone(220, 0.2, "sine", 0.09, 0, 160);
  }

  matchWin() {
    this.tone(523, 0.14, "triangle", 0.11);
    this.tone(659, 0.14, "triangle", 0.11, 0.12);
    this.tone(784, 0.22, "triangle", 0.12, 0.24);
  }

  matchLose() {
    this.tone(196, 0.25, "sawtooth", 0.09, 0, 120);
  }
}
