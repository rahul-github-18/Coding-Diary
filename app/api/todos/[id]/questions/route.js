import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  const requestStart = Date.now();
  const { id: todoId } = params;
  console.log(`[API GET /api/todos/${todoId}/questions] Start`);

  try {
    console.time(`Supabase Query: Get Questions for Todo ${todoId}`);
    const queryStart = Date.now();
    // Run todo existence check and questions fetch in parallel to eliminate waterfall requests
    const [todoResult, questionsResult] = await Promise.all([
      supabase
        .from('todos')
        .select('id')
        .eq('id', todoId)
        .maybeSingle(),
      supabase
        .from('questions')
        .select('id, todo_id, title, notes, code, updated_at')
        .eq('todo_id', todoId)
        .order('id', { ascending: true })
    ]);
    console.timeEnd(`Supabase Query: Get Questions for Todo ${todoId}`);
    const queryEnd = Date.now();
    console.log(`[API GET /api/todos/${todoId}/questions] Supabase query execution time: ${queryEnd - queryStart} ms`);

    const { data: todo, error: todoError } = todoResult;
    const { data: questions, error: questionsError } = questionsResult;

    if (todoError) throw todoError;
    if (!todo) {
      return NextResponse.json({ message: 'Todo item not found.' }, { status: 404 });
    }
    if (questionsError) throw questionsError;

    const requestEnd = Date.now();
    console.log(`[API GET /api/todos/${todoId}/questions] API execution time: ${requestEnd - requestStart} ms`);
    console.log(`[API GET /api/todos/${todoId}/questions] Total request time: ${requestEnd - requestStart} ms`);

    return NextResponse.json(questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json({ message: 'Failed to retrieve questions for this todo.' }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  const requestStart = Date.now();
  const { id: todoId } = params;
  console.log(`[API POST /api/todos/${todoId}/questions] Start`);

  try {
    const { title, notes, code } = await req.json();

    if (!title || title.trim() === '') {
      return NextResponse.json({ message: 'Question title is required.' }, { status: 400 });
    }

    console.time(`Supabase Query: Create Question for Todo ${todoId}`);
    const queryStart = Date.now();
    // Verify todo exists and insert the question
    const { data: todo, error: todoError } = await supabase
      .from('todos')
      .select('id')
      .eq('id', todoId)
      .maybeSingle();

    if (todoError) throw todoError;
    if (!todo) {
      console.timeEnd(`Supabase Query: Create Question for Todo ${todoId}`);
      return NextResponse.json({ message: 'Todo item not found.' }, { status: 404 });
    }

    const { data: newQuestion, error: insertError } = await supabase
      .from('questions')
      .insert({
        todo_id: todoId,
        title: title.trim(),
        notes: notes || '',
        code: code || ''
      })
      .select('id, todo_id, title, notes, code, updated_at')
      .single();
    console.timeEnd(`Supabase Query: Create Question for Todo ${todoId}`);
    const queryEnd = Date.now();
    console.log(`[API POST /api/todos/${todoId}/questions] Supabase query execution time: ${queryEnd - queryStart} ms`);

    if (insertError) throw insertError;

    const requestEnd = Date.now();
    console.log(`[API POST /api/todos/${todoId}/questions] API execution time: ${requestEnd - requestStart} ms`);
    console.log(`[API POST /api/todos/${todoId}/questions] Total request time: ${requestEnd - requestStart} ms`);

    return NextResponse.json(newQuestion, { status: 201 });
  } catch (error) {
    console.error('Error creating question:', error);
    return NextResponse.json({ message: 'Failed to add the question.' }, { status: 500 });
  }
}
