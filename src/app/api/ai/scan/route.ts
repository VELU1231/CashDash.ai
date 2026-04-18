import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check if user is Pro
    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    if (profile?.subscription_tier === 'free') {
      return NextResponse.json({ error: 'Upgrade to Pro to use Receipt Scanning' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');

    const prompt = `You are an expert financial assistant. I am providing you with an image of a receipt.
Please extract the following information and return ONLY a valid JSON object with these exact keys:
- "date": The date of the transaction (YYYY-MM-DD)
- "merchant": The name of the store or merchant
- "total": The total amount paid (number, no currency symbols)
- "currency": The currency code (e.g. USD, EUR, PHP)

If you cannot read the image or find a value, try your best to estimate or leave it null.
Return only JSON. Example:
{"date": "2024-05-12", "merchant": "Starbucks", "total": 5.50, "currency": "USD"}`;

    const ollamaPayload = {
      model: 'gemma4:31b-cloud',
      prompt: prompt,
      images: [base64Image],
      stream: false,
      format: 'json'
    };

    const response = await fetch(process.env.OLLAMA_URL || 'http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ollamaPayload)
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const result = await response.json();
    const extractedData = JSON.parse(result.response);

    return NextResponse.json({ success: true, data: extractedData });
  } catch (error: any) {
    console.error('OCR Scanning failed:', error);
    return NextResponse.json({ error: error.message || 'Scanning failed' }, { status: 500 });
  }
}
