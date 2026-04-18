import { lemonSqueezySetup } from '@lemonsqueezy/lemonsqueezy.js';

/**
 * Configure the Lemon Squeezy SDK for use on the server.
 * This should be called before making any Lemon Squeezy API calls.
 */
export function configureLemonSqueezy() {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  if (!apiKey) {
    console.warn('LEMONSQUEEZY_API_KEY is not defined in environment variables.');
    return;
  }
  
  lemonSqueezySetup({
    apiKey,
    onError: (error) => console.error('Lemon Squeezy Error:', error),
  });
}
