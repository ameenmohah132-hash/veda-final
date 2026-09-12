import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export const isNativePlatform = Capacitor.isNativePlatform();

export async function initCapacitorApp(isDarkMode: boolean = true) {
  if (!isNativePlatform) return;

  try {
    // Configure native status bar
    await StatusBar.setStyle({
      style: isDarkMode ? Style.Dark : Style.Light,
    });

    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({
        color: isDarkMode ? '#09090b' : '#fafafa',
      });
      await StatusBar.setOverlaysWebView({ overlay: false });
    }

    // Hide splash screen after initialization
    await SplashScreen.hide();
  } catch (err) {
    console.warn('Capacitor native setup notice:', err);
  }
}

export async function triggerHapticFeedback(style: ImpactStyle = ImpactStyle.Light) {
  if (!isNativePlatform) return;
  try {
    await Haptics.impact({ style });
  } catch {
    // Non-native fallback
  }
}
