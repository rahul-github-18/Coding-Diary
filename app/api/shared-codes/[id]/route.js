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

export async function DELETE(req, { params }) {
  try {
    const user = await checkUser(req);
    if (!user || !user.can_view) {
      return NextResponse.json({ message: 'Access Denied. Insufficient permissions.' }, { status: 403 });
    }

    const { id } = params;
    const { data: deletedSnippet, error } = await supabase
      .from('shared_codes')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error || !deletedSnippet) {
      return NextResponse.json({ message: 'Shared code not found or already expired.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Shared code deleted successfully.' });
  } catch (error) {
    console.error('DELETE shared code error:', error);
    return NextResponse.json({ message: 'Failed to delete shared code.' }, { status: 500 });
  }
}
