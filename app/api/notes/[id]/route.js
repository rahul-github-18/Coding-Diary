import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function checkUser(req) {
  const reqUserId = req.headers.get('x-user-id');
  if (!reqUserId) return null;

  const { data: user, error } = await supabase
    .from('users')
    .select('id, approved, role, can_view, can_edit, can_delete')
    .eq('id', reqUserId)
    .maybeSingle();

  if (error || !user || !user.approved) {
    return null;
  }
  return user;
}

export async function PUT(req, { params }) {
  try {
    const user = await checkUser(req);
    if (!user || !user.can_edit) {
      return NextResponse.json({ message: 'Access Denied. You do not have permission to edit content.' }, { status: 403 });
    }

    const { id } = params;
    const { title, content } = await req.json();

    const { data: note, error: fetchError } = await supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !note) {
      return NextResponse.json({ message: 'Note not found.' }, { status: 404 });
    }

    const newTitle = title !== undefined ? title.trim() : note.title;
    const newContent = content !== undefined ? content : note.content;

    if (newTitle === '') {
      return NextResponse.json({ message: 'Title cannot be empty.' }, { status: 400 });
    }
    if (newContent === '') {
      return NextResponse.json({ message: 'Content cannot be empty.' }, { status: 400 });
    }

    const { data: updatedNote, error: updateError } = await supabase
      .from('notes')
      .update({
        title: newTitle,
        content: newContent
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(updatedNote);
  } catch (error) {
    console.error('PUT note error:', error);
    return NextResponse.json({ message: 'Failed to update note.' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = await checkUser(req);
    if (!user || !user.can_delete) {
      return NextResponse.json({ message: 'Access Denied. You do not have permission to delete content.' }, { status: 403 });
    }

    const { id } = params;
    const { data: deletedNote, error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error || !deletedNote) {
      return NextResponse.json({ message: 'Note not found.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Note deleted successfully.' });
  } catch (error) {
    console.error('DELETE note error:', error);
    return NextResponse.json({ message: 'Failed to delete note.' }, { status: 500 });
  }
}
