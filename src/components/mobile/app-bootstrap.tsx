'use client';

import { useEffect, useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { Network } from '@capacitor/network';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowSquareOut, DownloadSimple, WifiSlash, X } from '@phosphor-icons/react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const INSTALL_DISMISS_KEY = 'cashbash-install-dismissed';

export function AppBootstrap() {
  const [isOffline, setIsOffline] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installHidden, setInstallHidden] = useState(true);
  const isNative = useMemo(() => Capacitor.isNativePlatform(), []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isDismissed = window.localStorage.getItem(INSTALL_DISMISS_KEY) === '1';

    const registerServiceWorker = async () => {
      if (!('serviceWorker' in navigator) || window.location.protocol === 'file:') return;
      try {
        await navigator.serviceWorker.register('/sw.js');
      } catch {
        // Ignore registration failures and keep the app usable online.
      }
    };

    const setWebOnlineStatus = () => setIsOffline(!navigator.onLine);
    setWebOnlineStatus();

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (isDismissed || isNative) return;
      setInstallEvent(event as BeforeInstallPromptEvent);
      setInstallHidden(false);
    };

    registerServiceWorker();
    window.addEventListener('online', setWebOnlineStatus);
    window.addEventListener('offline', setWebOnlineStatus);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('online', setWebOnlineStatus);
      window.removeEventListener('offline', setWebOnlineStatus);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [isNative]);

  useEffect(() => {
    if (!isNative) return;

    let networkListener: { remove: () => Promise<void> } | null = null;
    let appListener: { remove: () => Promise<void> } | null = null;

    const setupNative = async () => {
      try {
        await Promise.allSettled([
          SplashScreen.hide(),
          StatusBar.setStyle({ style: Style.Dark }),
          StatusBar.setBackgroundColor({ color: '#fafafa' }),
          StatusBar.setOverlaysWebView({ overlay: false }),
          Keyboard.setResizeMode({ mode: KeyboardResize.Body }),
        ]);

        const status = await Network.getStatus();
        setIsOffline(!status.connected);

        networkListener = await Network.addListener('networkStatusChange', (statusChange) => {
          setIsOffline(!statusChange.connected);
        });

        appListener = await App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) {
            SplashScreen.hide().catch(() => undefined);
          }
        });
      } catch {
        // Native plugins are optional during web rendering.
      }
    };

    setupNative();

    return () => {
      networkListener?.remove().catch(() => undefined);
      appListener?.remove().catch(() => undefined);
    };
  }, [isNative]);

  const dismissInstall = () => {
    setInstallHidden(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(INSTALL_DISMISS_KEY, '1');
    }
  };

  const promptInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const result = await installEvent.userChoice;
    if (result.outcome === 'accepted') {
      setInstallEvent(null);
      setInstallHidden(true);
      return;
    }
    dismissInstall();
  };

  return (
    <>
      <AnimatePresence>
        {isOffline && (
          <motion.div
            className="safe-area-top fixed inset-x-3 top-3 z-[80] rounded-2xl border border-amber-500/20 bg-card/95 px-4 py-3 shadow-lg backdrop-blur-xl md:left-auto md:right-6 md:inset-x-auto md:w-[360px]"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-500/10 p-2 text-amber-500">
                <WifiSlash className="h-4 w-4" weight="fill" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Offline mode</p>
                <p className="text-xs text-muted-foreground">Cached screens stay available while the connection is down.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isNative && installEvent && !installHidden && (
          <motion.div
            className="safe-area-bottom fixed inset-x-3 bottom-3 z-[80] md:left-auto md:right-6 md:inset-x-auto md:w-[380px]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="install-chip rounded-[1.75rem] p-4 backdrop-blur-xl">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-primary/10 p-2.5 text-primary">
                  <DownloadSimple className="h-5 w-5" weight="fill" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">Install CashBash</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Add the app to your phone home screen for an edge-to-edge finance view and faster launch.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button className="btn-primary !h-10 !rounded-2xl !px-4 !py-0" onClick={promptInstall}>
                      <ArrowSquareOut className="h-4 w-4" weight="bold" /> Install
                    </button>
                    <button className="btn-secondary !h-10 !rounded-2xl !px-4 !py-0" onClick={dismissInstall}>
                      Later
                    </button>
                  </div>
                </div>
                <button aria-label="Dismiss install prompt" className="rounded-xl p-1.5 text-muted-foreground transition-colors hover:text-foreground" onClick={dismissInstall}>
                  <X className="h-4 w-4" weight="bold" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}