import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCachedUser } from '@/lib/cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function checkAdmin(req) {
  const reqUserId = req.headers.get('x-user-id');
  if (!reqUserId) return null;

  const user = await getCachedUser(reqUserId);
  if (!user || user.role !== 'admin') {
    return null;
  }
  return reqUserId;
}

export async function GET(req) {
  console.time('API: GET /api/admin/login-history');
  try {
    const isAdmin = await checkAdmin(req);
    if (!isAdmin) {
      console.timeEnd('API: GET /api/admin/login-history');
      return NextResponse.json({ message: 'Access Denied. Admins only.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    // Fetch login history
    let query = supabase
      .from('login_history')
      .select('id, user_id, login_at, ip_address, user_agent, users(username)')
      .order('login_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', parseInt(userId, 10));
    }

    // Limit to prevent loading massive lists
    query = query.limit(100);

    console.time('Supabase: Fetch Login History');
    const { data: history, error } = await query;
    console.timeEnd('Supabase: Fetch Login History');

    if (error) {
      console.error('Supabase query error during fetching login history:', error);
      throw error;
    }

    console.timeEnd('API: GET /api/admin/login-history');
    return NextResponse.json(history, {
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate'
      }
    });
  } catch (error) {
    console.error('Admin GET login history error:', error);
    console.timeEnd('API: GET /api/admin/login-history');
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}
