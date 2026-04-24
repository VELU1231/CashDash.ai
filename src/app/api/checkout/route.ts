export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { configureLemonSqueezy } from '@/lib/lemonsqueezy';
import { createCheckout } from '@lemonsqueezy/lemonsqueezy.js';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { variantId } = await req.json();

    if (!variantId) {
      return NextResponse.json({ error: 'Variant ID is required' }, { status: 400 });
    }

    const storeId = process.env.LEMONSQUEEZY_STORE_ID;

    if (!storeId) {
      console.error('LEMONSQUEEZY_STORE_ID is not configured');
      return NextResponse.json({ error: 'Lemon Squeezy store ID is missing' }, { status: 500 });
    }

    // Initialize SDK
    configureLemonSqueezy();

    const newCheckout = {
      checkoutData: {
        custom: {
          user_id: user.id, // Very important: links checkout to Supabase user
        },
      },
      productOptions: {
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?upgrade=success`,
        receiptButtonText: 'Go to Dashboard',
        receiptThankYouNote: 'Thank you for upgrading CashBash.ai!'
      }
    };

    const { data, error } = await createCheckout(
      parseInt(storeId, 10),
      parseInt(variantId, 10),
      newCheckout
    );

    if (error) {
      console.error('LemonSqueezy Checkout Error:', error);
      return NextResponse.json({ error: error.message || 'Failed to create checkout' }, { status: 500 });
    }

    if (!data?.data?.attributes?.url) {
      return NextResponse.json({ error: 'Invalid response from Lemon Squeezy' }, { status: 500 });
    }

    return NextResponse.json({ url: data.data.attributes.url });
  } catch (error: any) {
    console.error('Checkout API failed:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

