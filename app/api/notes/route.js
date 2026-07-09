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

export async function GET(req) {
  try {
    const user = await checkUser(req);
    if (!user || !user.can_view) {
      return NextResponse.json({ message: 'Access Denied. Insufficient permissions.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const topicId = searchParams.get('topic_id');

    if (!topicId) {
      return NextResponse.json({ message: 'topic_id is required.' }, { status: 400 });
    }

    const { data: notes, error } = await supabase
      .from('notes')
      .select('*')
      .eq('topic_id', topicId)
      .order('id', { ascending: true });

    if (error) throw error;

    // Fetch user completion status for these notes
    const { data: tasks, error: tasksError } = await supabase
      .from('user_tasks')
      .select('item_id, status, saved_for_later')
      .eq('user_id', user.id)
      .eq('item_type', 'note');

    if (tasksError) throw tasksError;

    const taskMap = {};
    tasks.forEach(t => {
      taskMap[t.item_id] = {
        status: t.status,
        saved_for_later: t.saved_for_later
      };
    });

    const enrichedNotes = (notes || []).map(n => ({
      ...n,
      status: taskMap[n.id]?.status || 'Pending',
      saved_for_later: taskMap[n.id]?.saved_for_later || false
    }));

    return NextResponse.json(enrichedNotes);
  } catch (error) {
    console.error('GET notes error:', error);
    return NextResponse.json({ message: 'Failed to retrieve notes.' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await checkUser(req);
    if (!user || !user.can_edit) {
      return NextResponse.json({ message: 'Access Denied. You do not have permission to edit content.' }, { status: 403 });
    }

    const { topic_id, title, content } = await req.json();

    if (!topic_id) {
      return NextResponse.json({ message: 'topic_id is required.' }, { status: 400 });
    }
    if (!title || title.trim() === '') {
      return NextResponse.json({ message: 'Note title is required.' }, { status: 400 });
    }
    if (!content || content.trim() === '') {
      return NextResponse.json({ message: 'Note content cannot be empty.' }, { status: 400 });
    }

    // Verify topic exists (todos table)
    const { data: topic, error: topicError } = await supabase
      .from('todos')
      .select('id')
      .eq('id', topic_id)
      .maybeSingle();

    if (topicError || !topic) {
      return NextResponse.json({ message: 'Topic not found.' }, { status: 404 });
    }

    const { data: newNote, error: insertError } = await supabase
      .from('notes')
      .insert({
        topic_id: topic_id,
        title: title.trim(),
        content: content
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json(newNote, { status: 201 });
  } catch (error) {
    console.error('POST note error:', error);
    return NextResponse.json({ message: 'Failed to create note.' }, { status: 500 });
  }
}
