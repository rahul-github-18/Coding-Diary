import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function cleanExpiredCodes() {
  const start = Date.now();
  console.log('[cleanExpiredCodes] Start background cleanup');
  try {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    console.time('Supabase Query: Cleanup Expired Codes');
    await supabase
      .from('shared_codes')
      .delete()
      .lt('created_at', fifteenMinutesAgo);
    console.timeEnd('Supabase Query: Cleanup Expired Codes');
    console.log(`[cleanExpiredCodes] Finished cleanup in ${Date.now() - start} ms`);
  } catch (error) {
    console.error('Error cleaning expired shared codes:', error);
  }
}

export async function GET() {
  const requestStart = Date.now();
  console.log('[API GET /api/shared-codes] Start');
  try {
    // Fire-and-forget: clean up expired codes asynchronously without blocking the response
    cleanExpiredCodes();

    console.time('Supabase Query: Get Shared Codes');
    const queryStart = Date.now();
    const { data: sharedCodes, error } = await supabase
      .from('shared_codes')
      .select('id, title, code, created_at')
      .order('created_at', { ascending: false });
    console.timeEnd('Supabase Query: Get Shared Codes');
    const queryEnd = Date.now();
    console.log(`[API GET /api/shared-codes] Supabase query execution time: ${queryEnd - queryStart} ms`);

    if (error) throw error;

    // Format created_at to YYYY-MM-DD HH:MM:SS format
    const formattedCodes = sharedCodes.map(item => {
      const d = new Date(item.created_at);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      return {
        ...item,
        created_at: `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`
      };
    });

    const requestEnd = Date.now();
    console.log(`[API GET /api/shared-codes] API execution time: ${requestEnd - requestStart} ms`);
    console.log(`[API GET /api/shared-codes] Total request time: ${requestEnd - requestStart} ms`);

    return NextResponse.json(formattedCodes);
  } catch (error) {
    console.error('Error fetching shared codes:', error);
    return NextResponse.json({ message: 'Failed to retrieve shared codes.' }, { status: 500 });
  }
}

export async function POST(req) {
  const requestStart = Date.now();
  console.log('[API POST /api/shared-codes] Start');
  try {
    const { title, code } = await req.json();

    if (!title || title.trim() === '') {
      return NextResponse.json({ message: 'Title is required to share code.' }, { status: 400 });
    }
    if (!code || code.trim() === '') {
      return NextResponse.json({ message: 'Code content cannot be empty.' }, { status: 400 });
    }

    // Fire-and-forget expired codes cleanup
    cleanExpiredCodes();

    console.time('Supabase Query: Share Code');
    const queryStart = Date.now();
    const { data: newSnippet, error: insertError } = await supabase
      .from('shared_codes')
      .insert({
        title: title.trim(),
        code: code
      })
      .select('id, title, code, created_at')
      .single();
    console.timeEnd('Supabase Query: Share Code');
    const queryEnd = Date.now();
    console.log(`[API POST /api/shared-codes] Supabase query execution time: ${queryEnd - queryStart} ms`);

    if (insertError) throw insertError;

    // Format created_at to YYYY-MM-DD HH:MM:SS format
    const d = new Date(newSnippet.created_at);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');

    const formattedSnippet = {
      ...newSnippet,
      created_at: `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`
    };

    const requestEnd = Date.now();
    console.log(`[API POST /api/shared-codes] API execution time: ${requestEnd - requestStart} ms`);
    console.log(`[API POST /api/shared-codes] Total request time: ${requestEnd - requestStart} ms`);

    return NextResponse.json(formattedSnippet, { status: 201 });
  } catch (error) {
    console.error('Error sharing code:', error);
    return NextResponse.json({ message: 'Failed to share the code snippet.' }, { status: 500 });
  }
}
