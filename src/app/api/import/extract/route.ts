import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractTransactionsFromText } from '@/lib/smart-parser';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const defaultCurrency = formData.get('currency') as string || 'USD';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    let text = '';

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      return NextResponse.json({ error: 'PDF files must be processed on the client side.' }, { status: 400 });
    } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      text = buffer.toString('utf-8');
    } else {
      // For images, we should have processed them on the client side with Tesseract.js
      // If they somehow get here, we can't parse them easily on the server without installing Tesseract native bindings
      return NextResponse.json({ error: 'Unsupported file type. Images should be processed on the client.' }, { status: 400 });
    }

    if (!text || text.trim() === '') {
      return NextResponse.json({ error: 'No text could be extracted from the file' }, { status: 400 });
    }

    const transactions = extractTransactionsFromText(text, defaultCurrency);

    return NextResponse.json({ 
      success: true, 
      count: transactions.length,
      transactions,
      raw_text_sample: text.substring(0, 200) + '...' // For debugging
    });

  } catch (error: any) {
    console.error('Extraction failed:', error);
    return NextResponse.json({ error: error.message || 'Extraction failed' }, { status: 500 });
  }
}

