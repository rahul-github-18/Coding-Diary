import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const requestStart = Date.now();
  console.log('[API GET /api/todos] Start');
  try {
    console.time('Supabase Query: Get Todos & Questions');
    const queryStart = Date.now();
    
    // Fetch todos and questions in parallel to eliminate waterfall requests
    const [todosResult, questionsResult] = await Promise.all([
      supabase
        .from('todos')
        .select('id, title, completed, created_date')
        .order('created_date', { ascending: false })
        .order('id', { ascending: false }),
      supabase
        .from('questions')
        .select('id, todo_id, title')
    ]);
    
    console.timeEnd('Supabase Query: Get Todos & Questions');
    const queryEnd = Date.now();
    console.log(`[API GET /api/todos] Supabase query execution time: ${queryEnd - queryStart} ms`);

    const { data: todos, error: todosError } = todosResult;
    const { data: questions, error: questionsError } = questionsResult;

    if (todosError) throw todosError;
    if (questionsError) throw questionsError;
    
    // Group questions by todo_id
    const questionsMap = {};
    questions.forEach(q => {
      if (!questionsMap[q.todo_id]) {
        questionsMap[q.todo_id] = [];
      }
      questionsMap[q.todo_id].push(q);
    });

    // Attach questions array to each todo
    const todosWithQuestions = todos.map(todo => ({
      ...todo,
      created_date: todo.created_date,
      questions: questionsMap[todo.id] || []
    }));

    const requestEnd = Date.now();
    console.log(`[API GET /api/todos] API execution time: ${requestEnd - requestStart} ms`);
    console.log(`[API GET /api/todos] Total request time: ${requestEnd - requestStart} ms`);

    return NextResponse.json(todosWithQuestions);
  } catch (error) {
    console.error('Error fetching todos:', error);
    return NextResponse.json(
      { message: 'Failed to retrieve coding tasks. Please ensure the database is running.' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  const requestStart = Date.now();
  console.log('[API POST /api/todos] Start');
  try {
    const { title } = await req.json();

    if (!title || title.trim() === '') {
      return NextResponse.json({ message: 'Todo title is required.' }, { status: 400 });
    }

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const createdDate = `${yyyy}-${mm}-${dd}`;

    console.time('Supabase Query: Create Todo');
    const queryStart = Date.now();
    const { data: newTodo, error } = await supabase
      .from('todos')
      .insert({
        title: title.trim(),
        completed: false,
        created_date: createdDate
      })
      .select('id, title, completed, created_date')
      .single();
    console.timeEnd('Supabase Query: Create Todo');
    const queryEnd = Date.now();
    console.log(`[API POST /api/todos] Supabase query execution time: ${queryEnd - queryStart} ms`);

    if (error) throw error;

    const requestEnd = Date.now();
    console.log(`[API POST /api/todos] API execution time: ${requestEnd - requestStart} ms`);
    console.log(`[API POST /api/todos] Total request time: ${requestEnd - requestStart} ms`);

    return NextResponse.json(newTodo, { status: 201 });
  } catch (error) {
    console.error('Error creating todo:', error);
    return NextResponse.json({ message: 'Failed to create the todo item.' }, { status: 500 });
  }
}
