import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CashDash.ai',
    short_name: 'CashDash',
    description: 'AI-powered personal finance tracker',
    start_url: '/',
    display: 'standalone',
    background_color: '#F1EAD6',
    theme_color: '#10b981',
    icons: [
      {
        src: '/icon',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
