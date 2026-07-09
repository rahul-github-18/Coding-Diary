import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function checkAdmin(req) {
  const reqUserId = req.headers.get('x-user-id');
  if (!reqUserId) return null;

  const { data: adminCheck, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', reqUserId)
    .maybeSingle();

  if (error || !adminCheck || adminCheck.role !== 'admin') {
    return null;
  }
  return reqUserId;
}

export async function GET(req) {
  try {
    const isAdmin = await checkAdmin(req);
    if (!isAdmin) {
      return NextResponse.json({ message: 'Access Denied. Admins only.' }, { status: 403 });
    }

    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, role, approved, can_view, can_edit, can_delete, streak')
      .order('approved', { ascending: true })
      .order('username', { ascending: true });

    if (error) throw error;

    return NextResponse.json(users);
  } catch (error) {
    console.error('Admin GET users error:', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}
