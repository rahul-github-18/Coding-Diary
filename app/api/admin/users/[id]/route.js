import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

import { getCachedUser, invalidateUserCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

async function checkAdmin(req) {
  const reqUserId = req.headers.get('x-user-id');
  if (!reqUserId) return null;

  const user = await getCachedUser(reqUserId);
  if (!user || user.role !== 'admin') {
    return null;
  }
  return reqUserId;
}

export async function PUT(req, { params }) {
  const { id } = params;
  const userId = parseInt(id, 10);
  const timerLabel = `API: PUT /api/admin/users/${id}`;
  console.time(timerLabel);
  try {
    const isAdmin = await checkAdmin(req);
    if (!isAdmin) {
      console.timeEnd(timerLabel);
      return NextResponse.json({ message: 'Access Denied. Admins only.' }, { status: 403 });
    }

    const { approved, can_view, can_edit, can_delete, role } = await req.json();

    // Fetch existing user details
    console.time('Supabase: Fetch User detail (PUT)');
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    console.timeEnd('Supabase: Fetch User detail (PUT)');

    if (fetchError || !user) {
      console.timeEnd(timerLabel);
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    const updateData = {};
    if (approved !== undefined) updateData.approved = approved;
    if (can_view !== undefined) updateData.can_view = can_view;
    if (can_edit !== undefined) updateData.can_edit = can_edit;
    if (can_delete !== undefined) updateData.can_delete = can_delete;
    if (role !== undefined) updateData.role = role;

    // Do update
    console.time('Supabase: Update User detail');
    const { data: updatedUsers, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('id, username, role, approved, can_view, can_edit, can_delete');
    console.timeEnd('Supabase: Update User detail');

    if (updateError) throw updateError;

    // Invalidate user cache to apply updates immediately
    invalidateUserCache(userId);

    if (!updatedUsers || updatedUsers.length === 0) {
      const { data: checkUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (checkUser) {
        console.timeEnd(timerLabel);
        return NextResponse.json({ 
          message: 'Could not update user. RLS policies on Supabase are active and blocking writes. Please run: ALTER TABLE users DISABLE ROW LEVEL SECURITY; in your Supabase SQL editor.' 
        }, { status: 400 });
      } else {
        console.timeEnd(timerLabel);
        return NextResponse.json({ message: 'User not found.' }, { status: 404 });
      }
    }

    console.timeEnd(timerLabel);
    return NextResponse.json(updatedUsers[0]);
  } catch (error) {
    console.error('Admin PUT user error:', error);
    console.timeEnd(timerLabel);
    return NextResponse.json({ message: error.message || 'Internal server error.' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const { id } = params;
  const userId = parseInt(id, 10);
  const timerLabel = `API: DELETE /api/admin/users/${id}`;
  console.time(timerLabel);
  try {
    const isAdmin = await checkAdmin(req);
    if (!isAdmin) {
      console.timeEnd(timerLabel);
      return NextResponse.json({ message: 'Access Denied. Admins only.' }, { status: 403 });
    }

    // Do delete
    console.time('Supabase: Delete User');
    const { data: deletedRows, error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)
      .select('id');
    console.timeEnd('Supabase: Delete User');

    if (deleteError) throw deleteError;

    // Invalidate user cache upon deletion
    invalidateUserCache(userId);

    if (!deletedRows || deletedRows.length === 0) {
      const { data: checkUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (checkUser) {
        console.timeEnd(timerLabel);
        return NextResponse.json({ 
          message: 'Could not delete user. RLS policies on Supabase are active and blocking writes. Please run: ALTER TABLE users DISABLE ROW LEVEL SECURITY; in your Supabase SQL editor.' 
        }, { status: 400 });
      }
    }

    console.timeEnd(timerLabel);
    return NextResponse.json({ message: 'User deleted successfully.' });
  } catch (error) {
    console.error('Admin DELETE user error:', error);
    console.timeEnd(timerLabel);
    return NextResponse.json({ message: error.message || 'Internal server error.' }, { status: 500 });
  }
}
