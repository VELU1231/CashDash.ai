import type { Metadata, Viewport } from 'next';
import { Inter, Fraunces, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { I18nProvider } from '@/lib/i18n';
import { Toaster } from 'sonner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
  axes: ['SOFT', 'WONK', 'opsz'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'CashDash.ai', template: '%s | CashDash.ai' },
  description: 'AI-powered personal finance tracker. Track spending, visualize money, and get smart insights — automatically.',
  keywords: ['personal finance', 'budget tracker', 'AI finance', 'expense tracker', 'money management'],
  authors: [{ name: 'DrVelu' }],
  creator: 'DrVelu',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://cashdash.ai',
    title: 'CashDash.ai — AI-Powered Finance Tracker',
    description: 'Your money, beautifully organized. Just say what you spent — AI does the rest.',
    siteName: 'CashDash.ai',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CashDash.ai',
    description: 'AI-powered personal finance tracker',
  },
  manifest: '/manifest.json',
  icons: { icon: '/favicon.ico', apple: '/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F1EAD6' },
    { media: '(prefers-color-scheme: dark)', color: '#14110E' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${fraunces.variable} ${jetbrainsMono.variable} font-sans antialiased grain-overlay`}>
        <I18nProvider>
          <Providers>
            {children}
            <Toaster
              position="top-right"
              richColors
              closeButton
              toastOptions={{
                classNames: {
                  toast: 'rounded-xl border shadow-glass font-sans backdrop-blur-sm',
                  title: 'font-semibold text-sm',
                  description: 'text-xs text-muted-foreground',
                },
              }}
            />
          </Providers>
        </I18nProvider>
      </body>
    </html>
  );
}
