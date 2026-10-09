/**
 * Universal Audio Beep Generator for QR Scans:
 * Synthesizes a clean, high-frequency dual-tone barcode scanner confirmation beep.
 */
export function playScanConfirmationBeep() {
  try {
    // 1. Web & Browser Audio API (Instant zero-latency synthesis)
    if (typeof window !== 'undefined') {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Pleasant dual-pitch POS scanner beep (1000Hz up to 1500Hz)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1050, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1450, ctx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.16);
        return;
      }
    }
  } catch (e) {
    // Graceful fallback if audio is not permitted or unsupported
    console.debug('Scan beep error:', e);
  }
}
