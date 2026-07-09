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

export async function PUT(req, { params }) {
  try {
    const isAdmin = await checkAdmin(req);
    if (!isAdmin) {
      return NextResponse.json({ message: 'Access Denied. Admins only.' }, { status: 403 });
    }

    const { id } = params;
    const { approved, can_view, can_edit, can_delete, role } = await req.json();

    // Fetch existing user details
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !user) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    const updateData = {};
    if (approved !== undefined) updateData.approved = approved;
    if (can_view !== undefined) updateData.can_view = can_view;
    if (can_edit !== undefined) updateData.can_edit = can_edit;
    if (can_delete !== undefined) updateData.can_delete = can_delete;
    if (role !== undefined) updateData.role = role;

    // Do update
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, username, role, approved, can_view, can_edit, can_delete')
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Admin PUT user error:', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}
