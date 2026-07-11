import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCachedUser } from '@/lib/cache';

export const dynamic = 'force-dynamic';

async function checkAdmin(req) {
  const reqUserId = req.headers.get('x-user-id');
  if (!reqUserId) return null;
  const user = await getCachedUser(reqUserId);
  if (!user || user.role !== 'admin') return null;
  return reqUserId;
}

export async function PUT(req, { params }) {
  try {
    const isAdmin = await checkAdmin(req);
    if (!isAdmin) {
      return NextResponse.json({ message: 'Access Denied. Admins only.' }, { status: 403 });
    }

    const { id } = params;
    const { admin_reply } = await req.json();

    if (!admin_reply || admin_reply.trim() === '') {
      return NextResponse.json({ message: 'Reply text is required.' }, { status: 400 });
    }

    const { data: updated, error } = await supabase
      .from('user_submissions')
      .update({
        admin_reply: admin_reply.trim(),
        replied_at: new Date().toISOString(),
        is_read_by_user: false  // triggers student notification
      })
      .eq('id', id)
      .select('*, users(username), todos(title)')
      .maybeSingle();

    if (error) throw error;
    if (!updated) {
      return NextResponse.json({ message: 'Submission not found.' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT admin submission reply error:', error);
    return NextResponse.json({ message: 'Failed to submit reply.' }, { status: 500 });
  }
}
