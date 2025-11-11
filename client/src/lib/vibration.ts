export type VibrationType = 
  | 'success'
  | 'warning'
  | 'error'
  | 'notification'
  | 'tap'
  | 'arrival'
  | 'alert';

const vibrationPatterns: Record<VibrationType, number | number[]> = {
  tap: 50,
  success: [100, 50, 100],
  warning: [200, 100, 200],
  error: [300, 100, 300, 100, 300],
  notification: [100, 50, 100, 50, 100],
  arrival: [200, 100, 200, 100, 200],
  alert: [400, 200, 400]
};

export function vibrate(type: VibrationType = 'tap') {
  if ('vibrate' in navigator) {
    const pattern = vibrationPatterns[type];
    navigator.vibrate(pattern);
  }
}

export function stopVibration() {
  if ('vibrate' in navigator) {
    navigator.vibrate(0);
  }
}

export function isVibrationSupported(): boolean {
  return 'vibrate' in navigator;
}
