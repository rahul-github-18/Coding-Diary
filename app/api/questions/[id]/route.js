import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  const requestStart = Date.now();
  const { id } = params;
  console.log(`[API GET /api/questions/${id}] Start`);
  try {
    console.time(`Supabase Query: Get Question ${id}`);
    const queryStart = Date.now();
    const { data: question, error } = await supabase
      .from('questions')
      .select('id, todo_id, title, notes, code, updated_at')
      .eq('id', id)
      .maybeSingle();
    console.timeEnd(`Supabase Query: Get Question ${id}`);
    const queryEnd = Date.now();
    console.log(`[API GET /api/questions/${id}] Supabase query execution time: ${queryEnd - queryStart} ms`);

    if (error) throw error;

    if (!question) {
      return NextResponse.json({ message: 'Question not found.' }, { status: 404 });
    }

    const requestEnd = Date.now();
    console.log(`[API GET /api/questions/${id}] API execution time: ${requestEnd - requestStart} ms`);
    console.log(`[API GET /api/questions/${id}] Total request time: ${requestEnd - requestStart} ms`);

    return NextResponse.json(question);
  } catch (error) {
    console.error('Error fetching question:', error);
    return NextResponse.json({ message: 'Failed to retrieve question details.' }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  const requestStart = Date.now();
  const { id } = params;
  console.log(`[API PUT /api/questions/${id}] Start`);
  try {
    const { title, notes, code } = await req.json();

    const updateData = {};
    if (title !== undefined) {
      if (title.trim() === '') {
        return NextResponse.json({ message: 'Title cannot be empty.' }, { status: 400 });
      }
      updateData.title = title.trim();
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    if (code !== undefined) {
      updateData.code = code;
    }

    // Set updated_at timestamp to now
    updateData.updated_at = new Date().toISOString();

    console.time(`Supabase Query: Update Question ${id}`);
    const queryStart = Date.now();
    const { data: updatedQuestion, error } = await supabase
      .from('questions')
      .update(updateData)
      .eq('id', id)
      .select('id, todo_id, title, notes, code, updated_at')
      .maybeSingle();
    console.timeEnd(`Supabase Query: Update Question ${id}`);
    const queryEnd = Date.now();
    console.log(`[API PUT /api/questions/${id}] Supabase query execution time: ${queryEnd - queryStart} ms`);

    if (error) throw error;

    if (!updatedQuestion) {
      return NextResponse.json({ message: 'Question not found.' }, { status: 404 });
    }

    const requestEnd = Date.now();
    console.log(`[API PUT /api/questions/${id}] API execution time: ${requestEnd - requestStart} ms`);
    console.log(`[API PUT /api/questions/${id}] Total request time: ${requestEnd - requestStart} ms`);

    return NextResponse.json(updatedQuestion);
  } catch (error) {
    console.error('Error updating question:', error);
    return NextResponse.json({ message: 'Failed to save question notes and code.' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const requestStart = Date.now();
  const { id } = params;
  console.log(`[API DELETE /api/questions/${id}] Start`);
  try {
    console.time(`Supabase Query: Delete Question ${id}`);
    const queryStart = Date.now();
    const { data: deletedQuestion, error } = await supabase
      .from('questions')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();
    console.timeEnd(`Supabase Query: Delete Question ${id}`);
    const queryEnd = Date.now();
    console.log(`[API DELETE /api/questions/${id}] Supabase query execution time: ${queryEnd - queryStart} ms`);

    if (error) throw error;

    if (!deletedQuestion) {
      return NextResponse.json({ message: 'Question not found.' }, { status: 404 });
    }

    const requestEnd = Date.now();
    console.log(`[API DELETE /api/questions/${id}] API execution time: ${requestEnd - requestStart} ms`);
    console.log(`[API DELETE /api/questions/${id}] Total request time: ${requestEnd - requestStart} ms`);

    return NextResponse.json({ message: 'Question deleted successfully.' });
  } catch (error) {
    console.error('Error deleting question:', error);
    return NextResponse.json({ message: 'Failed to delete the question.' }, { status: 500 });
  }
}
