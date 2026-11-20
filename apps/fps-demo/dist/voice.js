/**
 * Self-contained Character Voiceover Synthesizer for Beyond 3D (Chapter 1 & Chapter 2).
 *
 * Uses the browser's built-in Web Speech API (zh-CN / zh voice selection) paired with a
 * subtle WebAudio radio comm chirp so characters (Lin Xia 07, Station AI / Narrator) speak
 * clearly in Chinese with zero external CDN dependencies and zero errors in headless/silent browsers.
 */
export class CharacterVoice {
  constructor(spaceAudio = null) {
    this.audio = spaceAudio;
    this.enabled = true;
    this.unlocked = false;
    this.voices = [];
    this.lastText = '';
    this.lastSpokenAt = 0;
    this._supported = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';

    if (this._supported) {
      this._refreshVoices();
      try {
        window.speechSynthesis.addEventListener?.('voiceschanged', () => this._refreshVoices());
      } catch {}
    }
  }

  _refreshVoices() {
    if (!this._supported) return;
    try {
      const list = window.speechSynthesis.getVoices?.() || [];
      if (list.length) this.voices = list;
    } catch {}
  }

  _pickVoice(persona = 'linxia') {
    if (!this.voices.length) this._refreshVoices();
    const zh = this.voices.filter(v => /zh|cmn|chinese|mandarin/i.test(`${v.lang} ${v.name}`));
    if (!zh.length) return null;

    if (persona === 'linxia') {
      // Prefer warm female Mandarin voice (Xiaoxiao / Tingting / Meijia / Google Mandarin / zh-CN)
      const female = zh.find(v => /xiaoxiao|ting-?ting|yaoyao|huihui|mei-?jia|sin-?ji|female|女|zh-cn/i.test(`${v.name} ${v.lang}`));
      return female || zh[0];
    }
    if (persona === 'narrator' || persona === 'system') {
      const maleOrAlt = zh.find(v => /yunxi|kangkang|yunjian|male|男/i.test(v.name)) || zh[zh.length - 1];
      return maleOrAlt || zh[0];
    }
    return zh[0];
  }

  unlock() {
    this.unlocked = true;
    this._refreshVoices();
  }

  setEnabled(value) {
    this.enabled = Boolean(value);
    if (!this.enabled) this.stop();
    return this.enabled;
  }

  toggle() {
    return this.setEnabled(!this.enabled);
  }

  stop() {
    if (!this._supported) return;
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }

  _cleanSpeechText(raw) {
    return String(raw || '')
      .replace(/[“”「」【】『』<>]/g, '')
      .replace(/W\s*=\s*\+?0\.0/gi, 'W 等于零')
      .replace(/W\s*=\s*\+1\.8/gi, 'W 正一点八')
      .replace(/W\s*=\s*[−-]1\.8/gi, 'W 负一点八')
      .replace(/W\+/g, 'W 正')
      .replace(/W[−-]/g, 'W 负')
      .replace(/X\+/g, 'X 正')
      .replace(/X[−-]/g, 'X 负')
      .replace(/Y\+/g, 'Y 正')
      .replace(/Y[−-]/g, 'Y 负')
      .replace(/Z\+/g, 'Z 正')
      .replace(/Z[−-]/g, 'Z 负')
      .replace(/XW/g, 'X W')
      .replace(/XYZ/g, '三维')
      .replace(/\s+/g, ' ')
      .trim();
  }

  _playRadioChirp(persona = 'linxia') {
    const ctx = this.audio?.ctx;
    if (!ctx || this.audio?.muted || ctx.state !== 'running') return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const baseFreq = persona === 'linxia' ? 980 : 620;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.28, now + 0.055);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.045, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.085);
      osc.connect(gain);
      gain.connect(this.audio.master || ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch {}
  }

  speak(text, { persona = 'linxia', force = false, interrupt = true } = {}) {
    if (!this.enabled || !this.unlocked || !this._supported) return false;
    const clean = this._cleanSpeechText(text);
    if (!clean) return false;

    const now = performance.now ? performance.now() : Date.now();
    if (!force && clean === this.lastText && now - this.lastSpokenAt < 3500) {
      return false;
    }
    this.lastText = clean;
    this.lastSpokenAt = now;

    try {
      if (interrupt) window.speechSynthesis.cancel();
      this._playRadioChirp(persona);

      const utter = new window.SpeechSynthesisUtterance(clean);
      utter.lang = 'zh-CN';
      const voice = this._pickVoice(persona);
      if (voice) utter.voice = voice;

      if (persona === 'linxia') {
        utter.pitch = 1.16;
        utter.rate = 1.08;
        utter.volume = 0.92;
      } else if (persona === 'narrator' || persona === 'system') {
        utter.pitch = 0.92;
        utter.rate = 1.05;
        utter.volume = 0.85;
      } else {
        utter.pitch = 1.0;
        utter.rate = 1.05;
        utter.volume = 0.9;
      }

      window.speechSynthesis.speak(utter);
      return true;
    } catch {
      return false;
    }
  }
}
