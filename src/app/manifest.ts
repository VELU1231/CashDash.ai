import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CashDash.ai',
    short_name: 'CashDash',
    description: 'AI-powered personal finance tracker',
    start_url: '/dashboard',
    id: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone'],
    orientation: 'portrait',
    background_color: '#FAFAFA',
    theme_color: '#10b981',
    categories: ['finance', 'productivity', 'business'],
    shortcuts: [
      {
        name: 'New Transaction',
        short_name: 'Add',
        url: '/dashboard/transactions/new',
        description: 'Log a new transaction quickly',
      },
      {
        name: 'Dashboard',
        short_name: 'Overview',
        url: '/dashboard',
        description: 'Open the finance overview',
      },
      {
        name: 'Analytics',
        short_name: 'Analytics',
        url: '/dashboard/analytics',
        description: 'Review trends and insights',
      },
    ],
    icons: [
      {
        src: '/app-icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/app-icon-maskable.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
