// A piezo transducer on the navigator's suit. The ID signal is two short taps and a long one.
export function createRadio(enabled) {
  let context;
  const notes = {
    ident: [[0, 0.07, 395], [0.15, 0.07, 395], [0.34, 0.24, 395]],
    page: [[0, 0.09, 230]],
    contact: [[0, 0.08, 340], [0.11, 0.12, 442]],
    receipt: [[0, 0.07, 395], [0.15, 0.07, 395], [0.34, 0.24, 395], [0.91, 0.28, 523]]
  };
  function play(signal) {
    if (!enabled || !window.AudioContext) return;
    try {
      context ??= new AudioContext();
      if (context.state === 'suspended') context.resume().catch(() => {});
      for (const [delay, length, pitch] of notes[signal]) {
        const start = context.currentTime + delay;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(pitch, start);
        oscillator.frequency.exponentialRampToValueAtTime(pitch * 0.92, start + length);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.045, start + 0.009);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
        oscillator.connect(gain).connect(context.destination);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
        oscillator.start(start);
        oscillator.stop(start + length + 0.01);
      }
    } catch { /* Captions carry every clue on devices without audio output. */ }
  }
  return { play, setEnabled(value) { enabled = value; } };
}
