import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function checkUser(req) {
  const reqUserId = req.headers.get('x-user-id');
  if (!reqUserId) return null;

  const { data: user, error } = await supabase
    .from('users')
    .select('id, approved, role, can_view')
    .eq('id', reqUserId)
    .maybeSingle();

  if (error || !user || !user.approved) {
    return null;
  }
  return user;
}

async function cleanExpiredCodes() {
  try {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const { error } = await supabase
      .from('shared_codes')
      .delete()
      .lt('created_at', fifteenMinutesAgo.toISOString());

    if (error) throw error;
    console.log('[cleanExpiredCodes] Finished background cleanup');
  } catch (error) {
    console.error('Error cleaning expired shared codes:', error);
  }
}

export async function GET(req) {
  try {
    const user = await checkUser(req);
    if (!user || !user.can_view) {
      return NextResponse.json({ message: 'Access Denied. Insufficient permissions.' }, { status: 403 });
    }

    // Clean up expired codes in background
    cleanExpiredCodes();

    const { data: sharedCodes, error } = await supabase
      .from('shared_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedCodes = (sharedCodes || []).map(item => {
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

    return NextResponse.json(formattedCodes);
  } catch (error) {
    console.error('GET shared codes error:', error);
    return NextResponse.json({ message: 'Failed to retrieve shared codes.' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await checkUser(req);
    if (!user || !user.can_view) {
      return NextResponse.json({ message: 'Access Denied. Insufficient permissions.' }, { status: 403 });
    }

    const { title, code } = await req.json();

    if (!title || title.trim() === '') {
      return NextResponse.json({ message: 'Title is required to share code.' }, { status: 400 });
    }
    if (!code || code.trim() === '') {
      return NextResponse.json({ message: 'Code content cannot be empty.' }, { status: 400 });
    }

    // Clean up expired codes in background
    cleanExpiredCodes();

    const { data: newSnippet, error: insertError } = await supabase
      .from('shared_codes')
      .insert({
        title: title.trim(),
        code: code
      })
      .select('id, title, code, created_at')
      .single();

    if (insertError) throw insertError;

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

    return NextResponse.json(formattedSnippet, { status: 201 });
  } catch (error) {
    console.error('POST shared code error:', error);
    return NextResponse.json({ message: 'Failed to share code snippet.' }, { status: 500 });
  }
}
