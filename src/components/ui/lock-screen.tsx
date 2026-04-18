'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, Shield } from 'lucide-react';

export function LockScreen({ children }: { children: React.ReactNode }) {
  const [isLocked, setIsLocked] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    const savedPin = localStorage.getItem('app_pin');
    const isUnlocked = sessionStorage.getItem('app_unlocked') === 'true';

    if (savedPin && !isUnlocked) {
      setIsLocked(true);
    }

    // Optional: Setup Idle timer
    let timeout: NodeJS.Timeout;
    const resetIdle = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (localStorage.getItem('app_pin')) {
          setIsLocked(true);
          sessionStorage.removeItem('app_unlocked');
        }
      }, 5 * 60 * 1000); // 5 minutes idle time
    };

    if (savedPin) {
      window.addEventListener('mousemove', resetIdle);
      window.addEventListener('keydown', resetIdle);
      window.addEventListener('touchstart', resetIdle);
      resetIdle();
    }

    return () => {
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      window.removeEventListener('touchstart', resetIdle);
      clearTimeout(timeout);
    };
  }, []);

  const handleUnlock = () => {
    const savedPin = localStorage.getItem('app_pin');
    if (pin === savedPin) {
      setIsLocked(false);
      setPin('');
      setError(false);
      sessionStorage.setItem('app_unlocked', 'true');
    } else {
      setError(true);
      setPin('');
      setTimeout(() => setError(false), 500);
    }
  };

  return (
    <>
      {children}
      <AnimatePresence>
        {isLocked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-xl flex flex-col items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={error ? { x: [-10, 10, -10, 10, 0] } : { scale: 1, y: 0 }}
              transition={{ duration: error ? 0.4 : 0.3 }}
              className="bg-card p-8 rounded-2xl shadow-xl border border-border w-full max-w-sm flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">App Locked</h2>
              <p className="text-sm text-muted-foreground mb-8">Enter your 4-digit PIN to continue</p>
              
              <div className="flex gap-3 mb-8">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className={`w-4 h-4 rounded-full border-2 transition-colors ${
                    i < pin.length ? 'bg-primary border-primary' : 'border-input bg-background'
                  } ${error ? 'border-destructive bg-destructive/20' : ''}`} />
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4 w-full">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <button
                    key={num}
                    onClick={() => {
                      if (pin.length < 4) {
                        const newPin = pin + num;
                        setPin(newPin);
                        if (newPin.length === 4) setTimeout(() => handleUnlock(), 100);
                      }
                    }}
                    className="h-14 rounded-full bg-muted/50 hover:bg-muted text-xl font-medium transition-colors"
                  >
                    {num}
                  </button>
                ))}
                <div />
                <button
                  onClick={() => {
                    if (pin.length < 4) {
                      const newPin = pin + '0';
                      setPin(newPin);
                      if (newPin.length === 4) setTimeout(() => handleUnlock(), 100);
                    }
                  }}
                  className="h-14 rounded-full bg-muted/50 hover:bg-muted text-xl font-medium transition-colors"
                >
                  0
                </button>
                <button
                  onClick={() => setPin(p => p.slice(0, -1))}
                  className="h-14 rounded-full hover:bg-muted text-sm font-medium transition-colors text-muted-foreground"
                >
                  DEL
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
