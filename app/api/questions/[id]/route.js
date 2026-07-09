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
    const { data: question, error } = await supabase
      .from('questions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !question) {
      return NextResponse.json({ message: 'Question not found.' }, { status: 404 });
    }

    return NextResponse.json(question);
  } catch (error) {
    console.error('GET question detail error:', error);
    return NextResponse.json({ message: 'Failed to retrieve question details.' }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const user = await checkUser(req);
    if (!user || !user.can_edit) {
      return NextResponse.json({ message: 'Access Denied. You do not have permission to edit content.' }, { status: 403 });
    }

    const { id } = params;
    const { title, description, difficulty, tags, answer, code, explanation, notes } = await req.json();

    const { data: question, error: fetchError } = await supabase
      .from('questions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !question) {
      return NextResponse.json({ message: 'Question not found.' }, { status: 404 });
    }

    const newTitle = title !== undefined ? title.trim() : question.title;
    const newDescription = description !== undefined ? description : question.description;
    const newDifficulty = difficulty !== undefined ? difficulty : question.difficulty;
    const newTags = tags !== undefined ? tags : question.tags;
    const newAnswer = answer !== undefined ? answer : question.answer;
    const newCode = code !== undefined ? code : question.code;
    const newExplanation = explanation !== undefined ? explanation : question.explanation;
    const newNotes = notes !== undefined ? notes : question.notes;

    if (newTitle === '') {
      return NextResponse.json({ message: 'Title cannot be empty.' }, { status: 400 });
    }

    const { data: updatedQuestion, error: updateError } = await supabase
      .from('questions')
      .update({
        title: newTitle,
        description: newDescription,
        difficulty: newDifficulty,
        tags: newTags,
        answer: newAnswer,
        code: newCode,
        explanation: newExplanation,
        notes: newNotes
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(updatedQuestion);
  } catch (error) {
    console.error('PUT question error:', error);
    return NextResponse.json({ message: 'Failed to update question.' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = await checkUser(req);
    if (!user || !user.can_delete) {
      return NextResponse.json({ message: 'Access Denied. You do not have permission to delete content.' }, { status: 403 });
    }

    const { id } = params;
    const { data: deletedQuestion, error } = await supabase
      .from('questions')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error || !deletedQuestion) {
      return NextResponse.json({ message: 'Question not found.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Question deleted successfully.' });
  } catch (error) {
    console.error('DELETE question error:', error);
    return NextResponse.json({ message: 'Failed to delete question.' }, { status: 500 });
  }
}
