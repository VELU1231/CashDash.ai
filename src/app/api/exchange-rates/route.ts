export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const baseCurrency = searchParams.get('base') || 'USD';

    // 1. Try to fetch from open.er-api.com (free, no key required)
    try {
      const response = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`, {
        next: { revalidate: 3600 } // Cache for 1 hour
      });
      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({ rates: data.rates, base: data.base_code });
      }
    } catch (e) {
      console.error('Failed to fetch live exchange rates:', e);
    }

    // 2. Fallback to hardcoded mock rates if API fails
    const mockRates: Record<string, number> = {
      USD: 1.0,
      EUR: 0.92,
      GBP: 0.79,
      JPY: 151.0,
      CAD: 1.36,
      AUD: 1.52,
      PHP: 56.5,
      INR: 83.3,
      SGD: 1.35,
      MYR: 4.75,
      THB: 36.5
    };

    // Calculate relative rates based on requested base
    const baseRate = mockRates[baseCurrency] || 1.0;
    const rates: Record<string, number> = {};
    for (const [currency, rate] of Object.entries(mockRates)) {
      rates[currency] = rate / baseRate;
    }

    return NextResponse.json({ rates, base: baseCurrency });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

