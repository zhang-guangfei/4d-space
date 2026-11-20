/**
 * Procedural Web Audio spatial soundscape & realistic suit/physics foley for Beyond 3D.
 * Zero external audio assets; unlocked cleanly on first user interaction.
 */
const CELL_FREQS = Object.freeze({
  'W+': 523.25, // C5
  'X+': 587.33, // D5
  'W-': 659.25, // E5
  'X-': 739.99, // F#5 (Lydian shimmer)
  'Y+': 440.00, // A4
  'Y-': 493.88, // B4
  'Z+': 783.99, // G5
  'Z-': 880.00  // A5
});

export class SpaceAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.ready = false;
    this.ambientGain = null;
    this.ambientOsc1 = null;
    this.ambientOsc2 = null;
    this.ambientFilter = null;
    this.thrusterGain = null;
    this.thrusterFilter = null;
    this.hoverGain = null;
    this.hoverOsc = null;
    this.noiseBuffer = null;
  }

  unlock() {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.45;
      this.master.connect(this.ctx.destination);
      this._buildNoiseBuffer();
      this._buildAmbient();
      this._buildContinuousFoley();
      this.ready = true;
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setMuted(muted) {
    this.muted = !!muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.45, this.ctx.currentTime, 0.04);
    }
    return this.muted;
  }

  toggleMute() {
    return this.setMuted(!this.muted);
  }

  _buildNoiseBuffer() {
    const sr = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, sr * 2, sr);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      // Soft pink-ish filtered noise for compressed gas / hull acoustics
      last = (last + 0.08 * white) / 1.08;
      data[i] = last * 2.8;
    }
    this.noiseBuffer = buf;
  }

  _buildAmbient() {
    const ctx = this.ctx;
    this.ambientFilter = ctx.createBiquadFilter();
    this.ambientFilter.type = 'lowpass';
    this.ambientFilter.frequency.value = 180;
    this.ambientGain = ctx.createGain();
    this.ambientGain.gain.value = 0.07;

    this.ambientOsc1 = ctx.createOscillator();
    this.ambientOsc1.type = 'sine';
    this.ambientOsc1.frequency.value = 65.41; // C2 warm orbital hull hum

    this.ambientOsc2 = ctx.createOscillator();
    this.ambientOsc2.type = 'triangle';
    this.ambientOsc2.frequency.value = 98.00; // G2 subtle fifth

    this.ambientOsc1.connect(this.ambientFilter);
    this.ambientOsc2.connect(this.ambientFilter);
    this.ambientFilter.connect(this.ambientGain);
    this.ambientGain.connect(this.master);

    this.ambientOsc1.start();
    this.ambientOsc2.start();
  }

  _buildContinuousFoley() {
    const ctx = this.ctx;
    // Compressed-gas RCS thruster sound for zero-G
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    this.thrusterFilter = ctx.createBiquadFilter();
    this.thrusterFilter.type = 'bandpass';
    this.thrusterFilter.frequency.value = 900;
    this.thrusterFilter.Q.value = 1.4;
    this.thrusterGain = ctx.createGain();
    this.thrusterGain.gain.value = 0;
    src.connect(this.thrusterFilter);
    this.thrusterFilter.connect(this.thrusterGain);
    this.thrusterGain.connect(this.master);
    src.start();

    // Subtle jetpack hover turbine hum (upper stage hover)
    this.hoverOsc = ctx.createOscillator();
    this.hoverOsc.type = 'sawtooth';
    this.hoverOsc.frequency.value = 112;
    const hFilter = ctx.createBiquadFilter();
    hFilter.type = 'lowpass';
    hFilter.frequency.value = 280;
    this.hoverGain = ctx.createGain();
    this.hoverGain.gain.value = 0;
    this.hoverOsc.connect(hFilter);
    hFilter.connect(this.hoverGain);
    this.hoverGain.connect(this.master);
    this.hoverOsc.start();
  }

  setMode(mode) {
    if (!this.ready || !this.ctx) return;
    const now = this.ctx.currentTime;
    if (mode === 'lower') {
      // Zero-G: airier, deeper spatial resonance
      this.ambientOsc1.frequency.setTargetAtTime(55.0, now, 0.5);
      this.ambientOsc2.frequency.setTargetAtTime(82.41, now, 0.5);
      this.ambientFilter.frequency.setTargetAtTime(140, now, 0.5);
    } else if (mode === 'chapter2') {
      // 4D bulk: crystalline harmonic bed
      this.ambientOsc1.frequency.setTargetAtTime(73.42, now, 0.5);
      this.ambientOsc2.frequency.setTargetAtTime(110.0, now, 0.5);
      this.ambientFilter.frequency.setTargetAtTime(220, now, 0.5);
    } else {
      this.ambientOsc1.frequency.setTargetAtTime(65.41, now, 0.5);
      this.ambientOsc2.frequency.setTargetAtTime(98.0, now, 0.5);
      this.ambientFilter.frequency.setTargetAtTime(180, now, 0.5);
    }
  }

  setThruster(intensity, boosted = false) {
    if (!this.ready || !this.ctx) return;
    const now = this.ctx.currentTime;
    const level = Math.max(0, Math.min(1, intensity)) * (boosted ? 0.20 : 0.12);
    this.thrusterGain.gain.setTargetAtTime(level, now, 0.05);
    this.thrusterFilter.frequency.setTargetAtTime(boosted ? 1450 : 920, now, 0.06);
  }

  setHover(active) {
    if (!this.ready || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.hoverGain.gain.setTargetAtTime(active ? 0.075 : 0, now, 0.06);
    this.hoverOsc.frequency.setTargetAtTime(active ? 128 : 96, now, 0.08);
  }

  _tone(freq, { duration = 0.25, type = 'sine', gain = 0.14, attack = 0.01, slideTo = null, delay = 0 } = {}) {
    if (!this.ready || !this.ctx || this.muted) return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(gain, now + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(g);
    g.connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  footstep(sprinting = false) {
    if (!this.ready || !this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    // Soft metallic deck heel thud
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(sprinting ? 105 : 88, now);
    osc.frequency.exponentialRampToValueAtTime(36, now + 0.07);
    g.gain.setValueAtTime(sprinting ? 0.11 : 0.07, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    osc.connect(g);
    g.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  jump() {
    this._tone(130, { duration: 0.16, type: 'triangle', gain: 0.11, slideTo: 240 });
  }

  land(impactSpeed = 2) {
    const g = Math.min(0.22, 0.05 + Math.abs(impactSpeed) * 0.03);
    this._tone(92, { duration: 0.13, type: 'sine', gain: g, slideTo: 34 });
  }

  seamCross(toCell, lowerMode = false) {
    const base = CELL_FREQS[toCell] || 523.25;
    this._tone(base, { duration: lowerMode ? 0.42 : 0.28, type: 'sine', gain: 0.09, attack: 0.015 });
    this._tone(base * 1.5, { duration: 0.22, type: 'triangle', gain: 0.035, delay: 0.04 });
  }

  laserFire() {
    this._tone(1380, { duration: 0.12, type: 'sine', gain: 0.11, slideTo: 520 });
    this._tone(2100, { duration: 0.07, type: 'triangle', gain: 0.05, slideTo: 980 });
  }

  laserLoopReturn() {
    // Crisp crystalline dual-ping when geodesic light hits back sensor!
    this._tone(880, { duration: 0.26, type: 'sine', gain: 0.13 });
    this._tone(1318.5, { duration: 0.34, type: 'sine', gain: 0.11, delay: 0.07 });
  }

  probeThrow() {
    this._tone(260, { duration: 0.12, type: 'triangle', gain: 0.10, slideTo: 420 });
  }

  probeBounce(speed = 2) {
    const g = Math.min(0.14, 0.02 + speed * 0.02);
    this._tone(340 + Math.min(260, speed * 35), { duration: 0.08, type: 'triangle', gain: g, slideTo: 180 });
  }

  wave(echo = false) {
    this._tone(320, { duration: 0.14, type: 'sine', gain: 0.06, slideTo: 410 });
    if (echo) {
      this._tone(640, { duration: 0.28, type: 'sine', gain: 0.09, delay: 0.12 });
      this._tone(960, { duration: 0.30, type: 'triangle', gain: 0.06, delay: 0.20 });
    }
  }

  hologramOpen() {
    this._tone(440, { duration: 0.20, type: 'sine', gain: 0.09 });
    this._tone(659.25, { duration: 0.26, type: 'sine', gain: 0.08, delay: 0.06 });
  }

  evidenceUnlocked() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      this._tone(f, { duration: 0.32, type: 'sine', gain: 0.11, delay: i * 0.075 });
    });
  }

  routeStep(stepNum) {
    const scale = [392, 440, 493.88, 523.25, 587.33, 659.25, 739.99, 783.99];
    const freq = scale[Math.max(0, Math.min(scale.length - 1, stepNum - 1))];
    this._tone(freq, { duration: 0.30, type: 'sine', gain: 0.12 });
  }

  routeFail() {
    this._tone(293.66, { duration: 0.22, type: 'triangle', gain: 0.11, slideTo: 220 });
    this._tone(220, { duration: 0.32, type: 'triangle', gain: 0.09, delay: 0.14, slideTo: 174.6 });
  }

  airlockUnlock() {
    this._tone(110, { duration: 0.65, type: 'sawtooth', gain: 0.10, slideTo: 65 });
    [261.63, 329.63, 392.0, 523.25].forEach((f, i) => {
      this._tone(f, { duration: 0.55, type: 'sine', gain: 0.10, delay: 0.12 + i * 0.09 });
    });
  }

  wSlideTone(wValue) {
    // Gentle pitch-mapped harmonic tick when shifting along W in Chapter 2
    const norm = Math.max(-1, Math.min(1, wValue / 3.2));
    const freq = 330 * Math.pow(2, norm * 0.65);
    this._tone(freq, { duration: 0.07, type: 'sine', gain: 0.045, attack: 0.005 });
  }
}
