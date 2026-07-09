import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function PUT(req, { params }) {
  const requestStart = Date.now();
  const { id } = params;
  console.log(`[API PUT /api/todos/${id}] Start`);
  try {
    const { title, completed } = await req.json();

    const updateData = {};
    if (title !== undefined) {
      if (title.trim() === '') {
        return NextResponse.json({ message: 'Title cannot be empty.' }, { status: 400 });
      }
      updateData.title = title.trim();
    }

    if (completed !== undefined) {
      updateData.completed = completed;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: 'No fields provided for update.' }, { status: 400 });
    }

    console.time(`Supabase Query: Update Todo ${id}`);
    const queryStart = Date.now();
    const { data: updatedTodo, error } = await supabase
      .from('todos')
      .update(updateData)
      .eq('id', id)
      .select('id, title, completed, created_date')
      .maybeSingle();
    console.timeEnd(`Supabase Query: Update Todo ${id}`);
    const queryEnd = Date.now();
    console.log(`[API PUT /api/todos/${id}] Supabase query execution time: ${queryEnd - queryStart} ms`);

    if (error) throw error;

    if (!updatedTodo) {
      return NextResponse.json({ message: 'Todo item not found.' }, { status: 404 });
    }

    const requestEnd = Date.now();
    console.log(`[API PUT /api/todos/${id}] API execution time: ${requestEnd - requestStart} ms`);
    console.log(`[API PUT /api/todos/${id}] Total request time: ${requestEnd - requestStart} ms`);

    return NextResponse.json(updatedTodo);
  } catch (error) {
    console.error('Error updating todo:', error);
    return NextResponse.json({ message: 'Failed to update the todo item.' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const requestStart = Date.now();
  const { id } = params;
  console.log(`[API DELETE /api/todos/${id}] Start`);
  try {
    console.time(`Supabase Query: Delete Todo ${id}`);
    const queryStart = Date.now();
    const { data: deletedTodo, error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();
    console.timeEnd(`Supabase Query: Delete Todo ${id}`);
    const queryEnd = Date.now();
    console.log(`[API DELETE /api/todos/${id}] Supabase query execution time: ${queryEnd - queryStart} ms`);

    if (error) throw error;

    if (!deletedTodo) {
      return NextResponse.json({ message: 'Todo item not found.' }, { status: 404 });
    }

    const requestEnd = Date.now();
    console.log(`[API DELETE /api/todos/${id}] API execution time: ${requestEnd - requestStart} ms`);
    console.log(`[API DELETE /api/todos/${id}] Total request time: ${requestEnd - requestStart} ms`);

    return NextResponse.json({ message: 'Todo deleted successfully.' });
  } catch (error) {
    console.error('Error deleting todo:', error);
    return NextResponse.json({ message: 'Failed to delete the todo item.' }, { status: 500 });
  }
}
