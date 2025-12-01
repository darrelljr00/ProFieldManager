import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

export interface SoundSettings {
  teamMessageSound: string;
  textMessageSound: string;
  volume: number;
  enabled: boolean;
}

const defaultSoundSettings: SoundSettings = {
  teamMessageSound: 'chime',
  textMessageSound: 'bell',
  volume: 0.7,
  enabled: true
};

// Available sound options
export const SOUND_OPTIONS = [
  { value: 'chime', label: 'Chime', file: 'chime.mp3' },
  { value: 'bell', label: 'Bell', file: 'bell.mp3' },
  { value: 'notification', label: 'Notification', file: 'notification.mp3' },
  { value: 'pop', label: 'Pop', file: 'pop.mp3' },
  { value: 'ding', label: 'Ding', file: 'ding.mp3' },
  { value: 'gentle', label: 'Gentle', file: 'gentle.mp3' },
  { value: 'modern', label: 'Modern', file: 'modern.mp3' },
  { value: 'subtle', label: 'Subtle', file: 'subtle.mp3' }
];

export function useSoundNotifications() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const [soundSettings, setSoundSettings] = useState<SoundSettings>(defaultSoundSettings);

  // Fetch sound settings from backend
  const { data: settings } = useQuery<SoundSettings>({
    queryKey: ['/api/settings/sounds'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    if (settings) {
      setSoundSettings({
        teamMessageSound: settings.teamMessageSound || defaultSoundSettings.teamMessageSound,
        textMessageSound: settings.textMessageSound || defaultSoundSettings.textMessageSound,
        volume: settings.volume !== undefined ? settings.volume : defaultSoundSettings.volume,
        enabled: settings.enabled !== undefined ? settings.enabled : defaultSoundSettings.enabled
      });
    }
  }, [settings]);

  // Initialize audio context on user interaction
  const initializeAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  // Generate sound using Web Audio API
  const generateSound = (type: string, volume: number) => {
    if (!audioContextRef.current || !soundSettings.enabled) return;

    const context = audioContextRef.current;
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    // Configure sound based on type
    switch (type) {
      case 'chime':
        // Pleasant chime sound
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, context.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, context.currentTime + 0.3);
        gainNode.gain.setValueAtTime(volume * 0.3, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5);
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 0.5);
        break;
        
      case 'bell':
        // Bell-like sound
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(1000, context.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(500, context.currentTime + 0.2);
        gainNode.gain.setValueAtTime(volume * 0.4, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.4);
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 0.4);
        break;
        
      case 'notification':
        // Modern notification sound
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(600, context.currentTime);
        oscillator.frequency.setValueAtTime(800, context.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(600, context.currentTime + 0.2);
        gainNode.gain.setValueAtTime(volume * 0.2, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 0.3);
        break;
        
      case 'pop':
        // Quick pop sound
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(400, context.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, context.currentTime + 0.05);
        oscillator.frequency.exponentialRampToValueAtTime(200, context.currentTime + 0.1);
        gainNode.gain.setValueAtTime(volume * 0.3, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.15);
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 0.15);
        break;
        
      case 'ding':
        // Classic ding sound
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1200, context.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, context.currentTime + 0.1);
        gainNode.gain.setValueAtTime(volume * 0.4, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.25);
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 0.25);
        break;
        
      case 'gentle':
        // Gentle, soft sound
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(500, context.currentTime);
        oscillator.frequency.linearRampToValueAtTime(600, context.currentTime + 0.2);
        oscillator.frequency.linearRampToValueAtTime(450, context.currentTime + 0.4);
        gainNode.gain.setValueAtTime(volume * 0.2, context.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume * 0.3, context.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.6);
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 0.6);
        break;
        
      case 'modern':
        // Modern tech sound
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(700, context.currentTime);
        oscillator.frequency.setValueAtTime(900, context.currentTime + 0.05);
        oscillator.frequency.setValueAtTime(600, context.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(750, context.currentTime + 0.15);
        gainNode.gain.setValueAtTime(volume * 0.25, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.2);
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 0.2);
        break;
        
      case 'subtle':
        // Very subtle sound
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(650, context.currentTime);
        gainNode.gain.setValueAtTime(volume * 0.15, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 0.3);
        break;
        
      default:
        // Default chime
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, context.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, context.currentTime + 0.3);
        gainNode.gain.setValueAtTime(volume * 0.3, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5);
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 0.5);
    }
  };

  const playTeamMessageSound = () => {
    initializeAudioContext();
    generateSound(soundSettings.teamMessageSound, soundSettings.volume);
  };

  const playTextMessageSound = () => {
    initializeAudioContext();
    generateSound(soundSettings.textMessageSound, soundSettings.volume);
  };

  const testSound = (soundType: string) => {
    initializeAudioContext();
    generateSound(soundType, soundSettings.volume);
  };

  return {
    soundSettings,
    setSoundSettings,
    playTeamMessageSound,
    playTextMessageSound,
    testSound,
    initializeAudioContext
  };
}