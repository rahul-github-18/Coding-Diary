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

export async function GET(req, { params }) {
  try {
    const user = await checkUser(req);
    if (!user || !user.can_view) {
      return NextResponse.json({ message: 'Access Denied. Insufficient permissions.' }, { status: 403 });
    }

    const { id } = params;

    // Fetch topic (todos table)
    const { data: topic, error: topicError } = await supabase
      .from('todos')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (topicError || !topic) {
      return NextResponse.json({ message: 'Topic not found.' }, { status: 404 });
    }

    // Fetch associated questions, code examples, and notes
    const [questionsRes, examplesRes, notesRes, tasksRes] = await Promise.all([
      supabase.from('questions').select('*').eq('todo_id', id).order('id', { ascending: true }),
      supabase.from('code_examples').select('*').eq('topic_id', id).order('id', { ascending: true }),
      supabase.from('notes').select('*').eq('topic_id', id).order('id', { ascending: true }),
      supabase.from('user_tasks').select('item_type, item_id, status, saved_for_later').eq('user_id', user.id)
    ]);

    if (questionsRes.error) throw questionsRes.error;
    if (examplesRes.error) throw examplesRes.error;
    if (notesRes.error) throw notesRes.error;
    if (tasksRes.error) throw tasksRes.error;

    // Create maps for quick lookup of item status/saved state
    const taskMap = {};
    tasksRes.data.forEach(t => {
      taskMap[`${t.item_type}_${t.item_id}`] = {
        status: t.status,
        saved_for_later: t.saved_for_later
      };
    });

    const questionsWithStatus = questionsRes.data.map(q => ({
      ...q,
      status: taskMap[`question_${q.id}`]?.status || 'Pending',
      saved_for_later: taskMap[`question_${q.id}`]?.saved_for_later || false
    }));

    const examplesWithStatus = examplesRes.data.map(e => ({
      ...e,
      status: taskMap[`code_example_${e.id}`]?.status || 'Pending',
      saved_for_later: taskMap[`code_example_${e.id}`]?.saved_for_later || false
    }));

    const notesWithStatus = notesRes.data.map(n => ({
      ...n,
      status: taskMap[`note_${n.id}`]?.status || 'Pending',
      saved_for_later: taskMap[`note_${n.id}`]?.saved_for_later || false
    }));

    const isTopicCompleted = taskMap[`topic_${topic.id}`]?.status === 'Completed';
    const isTopicSaved = taskMap[`topic_${topic.id}`]?.saved_for_later || false;

    return NextResponse.json({
      ...topic,
      completed: isTopicCompleted,
      saved_for_later: isTopicSaved,
      questions: questionsWithStatus,
      codeExamples: examplesWithStatus,
      notes: notesWithStatus
    });
  } catch (error) {
    console.error('GET topic detail error:', error);
    return NextResponse.json({ message: 'Failed to retrieve topic details.' }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const user = await checkUser(req);
    if (!user || !user.can_edit) {
      return NextResponse.json({ message: 'Access Denied. You do not have permission to edit content.' }, { status: 403 });
    }

    const { id } = params;
    const { title, category, difficulty, estimatedTime } = await req.json();

    const { data: topic, error: fetchError } = await supabase
      .from('todos')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !topic) {
      return NextResponse.json({ message: 'Topic not found.' }, { status: 404 });
    }

    const newTitle = title !== undefined ? title.trim() : topic.title;
    const newCategory = category !== undefined ? category : topic.category;
    const newDifficulty = difficulty !== undefined ? difficulty : topic.difficulty;
    const newEstimatedTime = estimatedTime !== undefined ? estimatedTime : topic.estimated_time;

    if (newTitle === '') {
      return NextResponse.json({ message: 'Title cannot be empty.' }, { status: 400 });
    }

    const { data: updatedTopic, error: updateError } = await supabase
      .from('todos')
      .update({
        title: newTitle,
        category: newCategory,
        difficulty: newDifficulty,
        estimated_time: newEstimatedTime
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(updatedTopic);
  } catch (error) {
    console.error('PUT topic error:', error);
    return NextResponse.json({ message: 'Failed to update topic.' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = await checkUser(req);
    if (!user || !user.can_delete) {
      return NextResponse.json({ message: 'Access Denied. You do not have permission to delete content.' }, { status: 403 });
    }

    const { id } = params;
    const { data: deletedTopic, error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error || !deletedTopic) {
      return NextResponse.json({ message: 'Topic not found.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Topic deleted successfully.' });
  } catch (error) {
    console.error('DELETE topic error:', error);
    return NextResponse.json({ message: 'Failed to delete topic.' }, { status: 500 });
  }
}
