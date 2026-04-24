export const runtime = 'edge';
import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || '';
    
    // Verify LemonSqueezy signature
    const hmac = crypto.createHmac('sha256', secret);
    const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8');
    const signatureBuffer = Buffer.from(signature, 'utf8');

    if (!crypto.timingSafeEqual(digest, signatureBuffer)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const eventName = payload.meta.event_name;
    const obj = payload.data.attributes;

    const supabase = await createClient(); // this will need service role to bypass RLS in a real app if auth is not present. But wait, webhooks don't have user cookies. 
    // We should use an admin client or a service role key to update profiles.
    
    // Fallback if no service role key is set: 
    // Usually webhooks need a service role key to update user records because RLS prevents anonymous updates.
    // Assuming process.env.SUPABASE_SERVICE_ROLE_KEY is available or we use a postgres function.
    
    const userId = payload.meta.custom_data?.user_id;
    if (!userId) {
      console.error('Webhook missing user_id in custom_data');
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    if (eventName === 'subscription_created' || eventName === 'subscription_updated') {
      const status = obj.status;
      const variantId = obj.variant_id; // In LemonSqueezy, variant ID determines the plan
      
      let tier = 'free';
      if (status === 'active' || status === 'past_due' || status === 'on_trial') {
        // Map your LemonSqueezy variant IDs to your tiers here
        // E.g. process.env.LEMONSQUEEZY_PRO_VARIANT_ID
        if (variantId.toString() === process.env.LEMONSQUEEZY_PRO_VARIANT_ID) tier = 'pro';
        else if (variantId.toString() === process.env.LEMONSQUEEZY_FAMILY_VARIANT_ID) tier = 'family';
        else if (variantId.toString() === process.env.LEMONSQUEEZY_BUSINESS_VARIANT_ID) tier = 'business';
        else tier = 'pro'; // Fallback for testing
      }

      // We need a supabase client that can bypass RLS since this is a server-to-server call
      // using the service role key.
      const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
      const adminSupabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { error } = await adminSupabase
        .from('profiles')
        .update({
          subscription_tier: tier,
          lemonsqueezy_customer_id: obj.customer_id.toString(),
          lemonsqueezy_subscription_id: payload.data.id.toString()
        })
        .eq('id', userId);

      if (error) throw error;
      console.log(`Updated user ${userId} to tier ${tier}`);
    } else if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired') {
      const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
      const adminSupabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      await adminSupabase
        .from('profiles')
        .update({ subscription_tier: 'free' })
        .eq('id', userId);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Webhook processing failed:', err.message);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

