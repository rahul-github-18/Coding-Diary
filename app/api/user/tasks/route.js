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

export async function GET(req) {
  try {
    const user = await checkUser(req);
    if (!user) {
      return NextResponse.json({ message: 'Access Denied. Insufficient permissions.' }, { status: 403 });
    }

    // Fetch user tasks
    const { data: userTasks, error: tasksError } = await supabase
      .from('user_tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('id', { ascending: false });

    if (tasksError) throw tasksError;

    if (!userTasks || userTasks.length === 0) {
      return NextResponse.json([]);
    }

    // Resolve detailed information in parallel (todos represents topics)
    const [topicsRes, questionsRes, examplesRes, notesRes] = await Promise.all([
      supabase.from('todos').select('id, title, category, difficulty, estimated_time'),
      supabase.from('questions').select('id, title, todo_id, difficulty'),
      supabase.from('code_examples').select('id, title, topic_id, language'),
      supabase.from('notes').select('id, title, topic_id')
    ]);

    if (topicsRes.error) throw topicsRes.error;
    if (questionsRes.error) throw questionsRes.error;
    if (examplesRes.error) throw examplesRes.error;
    if (notesRes.error) throw notesRes.error;

    const topicsMap = {};
    topicsRes.data.forEach(t => { topicsMap[t.id] = t; });
    const questionsMap = {};
    questionsRes.data.forEach(q => { questionsMap[q.id] = q; });
    const examplesMap = {};
    examplesRes.data.forEach(e => { examplesMap[e.id] = e; });
    const notesMap = {};
    notesRes.data.forEach(n => { notesMap[n.id] = n; });

    const enrichedTasks = userTasks.map(task => {
      let itemDetails = null;
      if (task.item_type === 'topic' || task.item_type === 'todo') {
        itemDetails = topicsMap[task.item_id];
      } else if (task.item_type === 'question') {
        itemDetails = questionsMap[task.item_id];
      } else if (task.item_type === 'code_example') {
        itemDetails = examplesMap[task.item_id];
      } else if (task.item_type === 'note') {
        itemDetails = notesMap[task.item_id];
      }

      const addedDateStr = task.added_date ? new Date(task.added_date).toISOString().split('T')[0] : '';

      return {
        ...task,
        added_date: addedDateStr,
        details: itemDetails || { title: 'Unknown Item (Deleted)' }
      };
    });

    return NextResponse.json(enrichedTasks);
  } catch (error) {
    console.error('GET user tasks error:', error);
    return NextResponse.json({ message: 'Failed to retrieve tasks.' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await checkUser(req);
    if (!user) {
      return NextResponse.json({ message: 'Access Denied. Insufficient permissions.' }, { status: 403 });
    }

    const { itemType, itemId, status, savedForLater } = await req.json();

    if (!itemType || !itemId) {
      return NextResponse.json({ message: 'itemType and itemId are required.' }, { status: 400 });
    }

    // Insert task or update status / saved state if it already exists (upsert)
    const { data: task, error: upsertError } = await supabase
      .from('user_tasks')
      .upsert({
        user_id: user.id,
        item_type: itemType,
        item_id: itemId,
        status: status || 'Pending',
        saved_for_later: savedForLater !== undefined ? savedForLater : false
      }, { onConflict: 'user_id,item_type,item_id' })
      .select()
      .single();

    if (upsertError) throw upsertError;

    return NextResponse.json(task);
  } catch (error) {
    console.error('POST user task error:', error);
    return NextResponse.json({ message: 'Failed to save task.' }, { status: 500 });
  }
}
