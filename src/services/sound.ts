import { Platform } from 'react-native';
import { createAudioPlayer } from 'expo-audio';
import { BeepSoundStyle } from './settings';

export { BeepSoundStyle };

export interface BeepSoundOption {
  id: BeepSoundStyle;
  name: string;
  subtitle: string;
  description: string;
  badge: string;
  badgeColor: string;
  icon: string;
}

export const BEEP_SOUND_OPTIONS: BeepSoundOption[] = [
  {
    id: 'tech-chirp',
    name: 'Modern Tech Chirp',
    subtitle: 'Ascending micro-tone',
    description: 'Crisp, contemporary 1050 Hz to 1550 Hz rising chirp. Snappy and high-tech.',
    badge: 'Recommended',
    badgeColor: '#4d6029',
    icon: 'flash-outline',
  },
  {
    id: 'laser-beep',
    name: 'Classic Laser Beep',
    subtitle: 'High-pitch punchy sine burst',
    description: 'Industrial 2250 Hz scanner tone. Unmistakable audibility in noisy outdoor streets.',
    badge: 'Loud & Clear',
    badgeColor: '#2563eb',
    icon: 'barcode-outline',
  },
  {
    id: 'fiber-bell',
    name: 'Fiber Optic Bell',
    subtitle: 'Harmonic chime chord',
    description: 'Gentle C6 + G6 acoustic glass chime. Warm, smooth, and non-fatiguing for all-day scans.',
    badge: 'Gentle & Soft',
    badgeColor: '#059669',
    icon: 'notifications-outline',
  },
  {
    id: 'dual-chime',
    name: 'Smart Dual Chime',
    subtitle: 'Two-stage affirmative blip',
    description: 'Melodic A5 (880 Hz) to E6 (1320 Hz) blip. Clear positive confirmation.',
    badge: 'Melodic',
    badgeColor: '#7c3aed',
    icon: 'musical-notes-outline',
  },
];

const SOUND_ASSETS: Record<BeepSoundStyle, any> = {
  'tech-chirp': require('../../assets/sounds/tech-chirp.wav'),
  'laser-beep': require('../../assets/sounds/laser-beep.wav'),
  'fiber-bell': require('../../assets/sounds/fiber-bell.wav'),
  'dual-chime': require('../../assets/sounds/dual-chime.wav'),
};

const playerCache: Partial<Record<BeepSoundStyle, any>> = {};

function playNativeSound(style: BeepSoundStyle) {
  try {
    const asset = SOUND_ASSETS[style] || SOUND_ASSETS['tech-chirp'];
    let player = playerCache[style];
    if (!player) {
      player = createAudioPlayer(asset);
      playerCache[style] = player;
    }
    if (typeof player.seekTo === 'function') {
      player.seekTo(0).catch(() => {});
    }
    player.play();
  } catch (e) {
    console.debug('[Audio] Native playback error:', e);
  }
}

function playWebSynthesized(style: BeepSoundStyle) {
  if (typeof window === 'undefined') return;
  const AudioContextClass =
    window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    if (style === 'laser-beep') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2250, now);
      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.085);
    } else if (style === 'fiber-bell') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1046.5, now);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1567.98, now);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.start();
      osc2.start();
      osc1.stop(now + 0.18);
      osc2.stop(now + 0.18);
    } else if (style === 'dual-chime') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1320, now + 0.055);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.setValueAtTime(0.02, now + 0.05);
      gain.gain.setValueAtTime(0.22, now + 0.055);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.14);
    } else {
      // Default 'tech-chirp'
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1050, now);
      osc.frequency.exponentialRampToValueAtTime(1550, now + 0.08);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.11);
    }
  } catch (e) {
    console.debug('Web audio synthesis error:', e);
  }
}

/**
 * Universal Audio Beep Generator for QR Scans:
 * Works on both Web (via Web Audio API) and Native Android/iOS (via expo-audio & bundled PCM WAV).
 */
export function playScanConfirmationBeep(style: BeepSoundStyle = 'tech-chirp') {
  try {
    if (Platform.OS === 'web') {
      playWebSynthesized(style);
    } else {
      playNativeSound(style);
    }
  } catch (e) {
    console.debug('Scan beep error:', e);
  }
}

/**
 * Pleasant subtle chime for Admin Toast Notifications:
 * Two-tone soft chime (E5 -> A5)
 */
export function playNotificationChime() {
  try {
    if (typeof window !== 'undefined') {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5

        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    }
  } catch (e) {
    console.debug('Notification chime error:', e);
  }
}
