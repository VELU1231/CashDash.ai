'use client';

import { ThemeProvider } from 'next-themes';
import React from 'react';
import { AppBootstrap } from '@/components/mobile/app-bootstrap';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange={false}
      storageKey="cashbash-theme"
    >
      <AppBootstrap />
      {children}
    </ThemeProvider>
  );
}
