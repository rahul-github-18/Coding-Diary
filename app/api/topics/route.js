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
    const search = searchParams.get('search') || '';
    const difficulty = searchParams.get('difficulty') || '';
    const category = searchParams.get('category') || '';

    // Query todos table in Supabase
    let query = supabase.from('todos').select('*');

    if (search) {
      query = query.or(`title.ilike.%${search}%,category.ilike.%${search}%`);
    }

    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }

    if (category) {
      query = query.eq('category', category);
    }

    const { data: todos, error: todosError } = await query.order('id', { ascending: false });
    if (todosError) throw todosError;

    // Fetch user completed tasks
    const { data: completedTasks, error: tasksError } = await supabase
      .from('user_tasks')
      .select('item_type, item_id, status')
      .eq('user_id', user.id)
      .eq('status', 'Completed');

    if (tasksError) throw tasksError;

    // Fetch items counts to compute progress
    const { data: allQuestions, error: qError } = await supabase.from('questions').select('id, todo_id');
    const { data: allExamples, error: eError } = await supabase.from('code_examples').select('id, topic_id');
    const { data: allNotes, error: nError } = await supabase.from('notes').select('id, topic_id');

    if (qError) throw qError;
    if (eError) throw eError;
    if (nError) throw nError;

    // Maps for counting items per todo (topic)
    const questionsCountMap = {};
    const examplesCountMap = {};
    const notesCountMap = {};

    const topicQuestionsMap = {};
    const topicExamplesMap = {};
    const topicNotesMap = {};

    allQuestions.forEach(q => {
      questionsCountMap[q.todo_id] = (questionsCountMap[q.todo_id] || 0) + 1;
      if (!topicQuestionsMap[q.todo_id]) topicQuestionsMap[q.todo_id] = [];
      topicQuestionsMap[q.todo_id].push(q.id);
    });

    allExamples.forEach(e => {
      examplesCountMap[e.topic_id] = (examplesCountMap[e.topic_id] || 0) + 1;
      if (!topicExamplesMap[e.topic_id]) topicExamplesMap[e.topic_id] = [];
      topicExamplesMap[e.topic_id].push(e.id);
    });

    allNotes.forEach(n => {
      notesCountMap[n.topic_id] = (notesCountMap[n.topic_id] || 0) + 1;
      if (!topicNotesMap[n.topic_id]) topicNotesMap[n.topic_id] = [];
      topicNotesMap[n.topic_id].push(n.id);
    });

    const completedQuestionIds = new Set(completedTasks.filter(t => t.item_type === 'question').map(t => t.item_id));
    const completedExampleIds = new Set(completedTasks.filter(t => t.item_type === 'code_example').map(t => t.item_id));
    const completedNoteIds = new Set(completedTasks.filter(t => t.item_type === 'note').map(t => t.item_id));
    const completedTopicIds = new Set(completedTasks.filter(t => t.item_type === 'topic').map(t => t.item_id));

    const enhancedTopics = (todos || []).map(todo => {
      const qTotal = questionsCountMap[todo.id] || 0;
      const eTotal = examplesCountMap[todo.id] || 0;
      const nTotal = notesCountMap[todo.id] || 0;
      const totalItems = qTotal + eTotal + nTotal;

      let completedItems = 0;
      if (topicQuestionsMap[todo.id]) {
        topicQuestionsMap[todo.id].forEach(qId => {
          if (completedQuestionIds.has(qId)) completedItems++;
        });
      }
      if (topicExamplesMap[todo.id]) {
        topicExamplesMap[todo.id].forEach(eId => {
          if (completedExampleIds.has(eId)) completedItems++;
        });
      }
      if (topicNotesMap[todo.id]) {
        topicNotesMap[todo.id].forEach(nId => {
          if (completedNoteIds.has(nId)) completedItems++;
        });
      }

      const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

      return {
        ...todo,
        total_questions: qTotal,
        total_examples: eTotal,
        total_notes: nTotal,
        completed_items: completedItems,
        total_items: totalItems,
        progress_percentage: percentage,
        completed: completedTopicIds.has(todo.id) || (totalItems > 0 && completedItems === totalItems)
      };
    });

    return NextResponse.json(enhancedTopics);
  } catch (error) {
    console.error('GET topics error:', error);
    return NextResponse.json({ message: 'Failed to retrieve topics.' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await checkUser(req);
    if (!user || !user.can_edit) {
      return NextResponse.json({ message: 'Access Denied. You do not have permission to edit content.' }, { status: 403 });
    }

    const { title, category, difficulty, estimatedTime } = await req.json();

    if (!title || title.trim() === '') {
      return NextResponse.json({ message: 'Topic title is required.' }, { status: 400 });
    }

    const { data: newTodo, error: insertError } = await supabase
      .from('todos')
      .insert({
        title: title.trim(),
        category: category || 'General',
        difficulty: difficulty || 'Beginner',
        estimated_time: estimatedTime || '1 hour'
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json(newTodo, { status: 201 });
  } catch (error) {
    console.error('POST topic error:', error);
    return NextResponse.json({ message: 'Failed to create topic.' }, { status: 500 });
  }
}
