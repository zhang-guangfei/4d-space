/**
 * Studio Neural Character Voiceover Engine for Beyond 3D (Chapter 1 & Chapter 2).
 *
 * Primary Engine:
 *   - Pre-rendered Kokoro-82M-v1.1-zh studio neural Mandarin voiceover clips
 *     (assets/voice/manifest.json -> MP3 @ 24kHz broadcast-mastered), delivering warm,
 *     human-quality Chinese voice acting identically across Chrome, Edge, Safari, Firefox & mobile.
 *   - Lin Xia (07): warm expressive studio female Mandarin voice (zf_001)
 *   - Narrator / System: calm authoritative studio male Mandarin voice (zm_010)
 *
 * Fallback Engine (for any dynamic/unlisted line):
 *   - Ranked Web Speech API voice selector strongly preferring Online Natural / Neural
 *     Mandarin voices (Xiaoxiao / Yunxi / Google 普通话 / Siri Tingting) over legacy SAPI voices.
 */
export class CharacterVoice {
  constructor(spaceAudio = null, { manifestUrl = 'assets/voice/manifest.json' } = {}) {
    this.audio = spaceAudio;
    this.enabled = true;
    this.unlocked = false;
    this.voices = [];
    this.lastText = '';
    this.lastSpokenAt = 0;
    this.engineMode = 'neural-studio';
    this._reqId = 0;
    this._clips = null;
    this._manifestUrl = manifestUrl;
    this._manifestPromise = null;
    this._player = typeof Audio === 'function' ? new Audio() : null;
    if (this._player) {
      this._player.preload = 'auto';
    }
    this._ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';

    if (this._ttsSupported) {
      this._refreshVoices();
      try {
        window.speechSynthesis.addEventListener?.('voiceschanged', () => this._refreshVoices());
      } catch {}
    }

    // Preload neural voice manifest eagerly in browser
    if (typeof fetch === 'function' && typeof window !== 'undefined') {
      this._loadManifest();
    }
  }

  _loadManifest() {
    if (this._manifestPromise) return this._manifestPromise;
    this._manifestPromise = fetch(this._manifestUrl)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        this._clips = data && data.clips ? data.clips : {};
        return this._clips;
      })
      .catch(() => {
        this._clips = {};
        return this._clips;
      });
    return this._manifestPromise;
  }

  _refreshVoices() {
    if (!this._ttsSupported) return;
    try {
      const list = window.speechSynthesis.getVoices?.() || [];
      if (list.length) this.voices = list;
    } catch {}
  }

  _pickBestBrowserVoice(persona = 'linxia') {
    if (!this.voices.length) this._refreshVoices();
    const zh = this.voices.filter(v => /zh|cmn|chinese|mandarin|普通话/i.test(`${v.lang} ${v.name}`));
    if (!zh.length) return null;

    const scoreVoice = (v) => {
      const label = `${v.name} ${v.lang}`;
      let score = 0;
      if (/zh[-_]cn/i.test(v.lang)) score += 30;
      if (/natural|neural|online|enhanced|premium/i.test(label)) score += 100;
      if (/google/i.test(label)) score += 65;
      if (persona === 'linxia') {
        if (/xiaoxiao|xiaoyi|xiaoxuan|xiaoshuang|ting-?ting|mei-?jia/i.test(label)) score += 55;
        if (/female|女/i.test(label)) score += 20;
        if (/yunxi|yunjian|yunyang|kangkang|male|男/i.test(label)) score -= 30;
      } else {
        if (/yunxi|yunjian|yunyang|yunjie/i.test(label)) score += 55;
        if (/male|男/i.test(label)) score += 20;
      }
      return score;
    };

    const ranked = [...zh].sort((a, b) => scoreVoice(b) - scoreVoice(a));
    return ranked[0] || zh[0];
  }

  unlock() {
    this.unlocked = true;
    this._refreshVoices();
    if (typeof fetch === 'function' && !this._manifestPromise) {
      this._loadManifest();
    }
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
    this._reqId++;
    if (this._player) {
      try {
        this._player.pause();
        this._player.currentTime = 0;
      } catch {}
    }
    if (this._ttsSupported) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  }

  _cleanSpeechText(raw) {
    return String(raw || '')
      .replace(/[“”「」【】『』<>]/g, '')
      .replace(/W\s*=\s*\+?0\.0/gi, 'W等于零')
      .replace(/W\s*=\s*\+?0(?![.\d])/gi, 'W等于零')
      .replace(/W\s*=\s*\+1\.8/gi, 'W正一点八')
      .replace(/W\s*=\s*[−-]1\.8/gi, 'W负一点八')
      .replace(/W\+/g, 'W正')
      .replace(/W[−-]/g, 'W负')
      .replace(/X\+/g, 'X正')
      .replace(/X[−-]/g, 'X负')
      .replace(/Y\+/g, 'Y正')
      .replace(/Y[−-]/g, 'Y负')
      .replace(/Z\+/g, 'Z正')
      .replace(/Z[−-]/g, 'Z负')
      .replace(/XW/g, 'XW')
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
      if (persona === 'tomb') {
        // Deep metallic monument resonance for Relic AI 「墓地」 (D12)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(196, now);
        osc.frequency.exponentialRampToValueAtTime(147, now + 0.16);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.042, now + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
        osc.connect(gain);
        gain.connect(this.audio.master || ctx.destination);
        osc.start(now);
        osc.stop(now + 0.19);
        return;
      }
      osc.type = 'sine';
      const baseFreq = persona === 'linxia' ? 1040 : 660;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.24, now + 0.048);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.032, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);
      osc.connect(gain);
      gain.connect(this.audio.master || ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch {}
  }

  _playNeuralClip(clipUrl, persona) {
    if (!this._player) return false;
    try {
      this._player.pause();
      this._player.src = clipUrl;
      this._player.currentTime = 0;
      this._player.volume = persona === 'linxia' ? 0.96 : persona === 'tomb' ? 0.94 : 0.90;
      if ('preservesPitch' in this._player) {
        this._player.preservesPitch = persona !== 'tomb';
      }
      this._player.playbackRate = persona === 'tomb' ? 0.84 : 1.0;
      const p = this._player.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
      return true;
    } catch {
      return false;
    }
  }

  _speakFallbackTTS(clean, persona) {
    if (!this._ttsSupported) return false;
    try {
      window.speechSynthesis.cancel();
      const utter = new window.SpeechSynthesisUtterance(clean);
      utter.lang = 'zh-CN';
      const voice = this._pickBestBrowserVoice(persona);
      if (voice) utter.voice = voice;
      utter.pitch = persona === 'linxia' ? 1.04 : persona === 'tomb' ? 0.72 : 0.95;
      utter.rate = persona === 'tomb' ? 0.88 : 1.03;
      utter.volume = 0.92;
      window.speechSynthesis.speak(utter);
      return true;
    } catch {
      return false;
    }
  }

  speak(text, { persona = 'linxia', force = false, interrupt = true } = {}) {
    if (!this.enabled || !this.unlocked) return false;
    const clean = this._cleanSpeechText(text);
    if (!clean) return false;

    const now = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    if (!force && clean === this.lastText && now - this.lastSpokenAt < 3500) {
      return false;
    }
    this.lastText = clean;
    this.lastSpokenAt = now;

    if (interrupt) this.stop();
    const myReqId = ++this._reqId;

    const dispatch = (clips) => {
      if (!this.enabled || myReqId !== this._reqId) return false;
      this._playRadioChirp(persona);
      const clipUrl = clips && clips[clean];
      if (clipUrl && this._playNeuralClip(clipUrl, persona)) {
        return true;
      }
      return this._speakFallbackTTS(clean, persona);
    };

    if (this._clips) {
      return dispatch(this._clips);
    }
    if (this._manifestPromise) {
      this._manifestPromise.then(clips => dispatch(clips));
      return true;
    }
    return dispatch(null);
  }
}
