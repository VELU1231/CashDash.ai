import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { configureLemonSqueezy } from '@/lib/lemonsqueezy';
import { getCustomer } from '@lemonsqueezy/lemonsqueezy.js';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user's LemonSqueezy customer ID from their profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('lemonsqueezy_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.lemonsqueezy_customer_id) {
      return NextResponse.json({ error: 'No active subscription found for this user.' }, { status: 400 });
    }

    // Initialize SDK
    configureLemonSqueezy();

    const { data: customerData, error } = await getCustomer(profile.lemonsqueezy_customer_id);

    if (error) {
      console.error('LemonSqueezy Portal Error:', error);
      return NextResponse.json({ error: error.message || 'Failed to fetch customer portal' }, { status: 500 });
    }

    const portalUrl = customerData?.data?.attributes?.urls?.customer_portal;

    if (!portalUrl) {
      return NextResponse.json({ error: 'Customer portal URL not available.' }, { status: 500 });
    }

    return NextResponse.json({ url: portalUrl });
  } catch (error: any) {
    console.error('Portal API failed:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

