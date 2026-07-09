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
    const { title, language, code, explanation, notes } = await req.json();

    const { data: example, error: fetchError } = await supabase
      .from('code_examples')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !example) {
      return NextResponse.json({ message: 'Code example not found.' }, { status: 404 });
    }

    const newTitle = title !== undefined ? title : example.title;
    const newLanguage = language !== undefined ? language : example.language;
    const newCode = code !== undefined ? code : example.code;
    const newExplanation = explanation !== undefined ? explanation : example.explanation;
    const newNotes = notes !== undefined ? notes : example.notes;

    if (!newCode || newCode.trim() === '') {
      return NextResponse.json({ message: 'Code block cannot be empty.' }, { status: 400 });
    }

    const { data: updatedExample, error: updateError } = await supabase
      .from('code_examples')
      .update({
        title: newTitle,
        language: newLanguage,
        code: newCode,
        explanation: newExplanation,
        notes: newNotes
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(updatedExample);
  } catch (error) {
    console.error('PUT code example error:', error);
    return NextResponse.json({ message: 'Failed to update code example.' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = await checkUser(req);
    if (!user || !user.can_delete) {
      return NextResponse.json({ message: 'Access Denied. You do not have permission to delete content.' }, { status: 403 });
    }

    const { id } = params;
    const { data: deletedExample, error } = await supabase
      .from('code_examples')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error || !deletedExample) {
      return NextResponse.json({ message: 'Code example not found.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Code example deleted successfully.' });
  } catch (error) {
    console.error('DELETE code example error:', error);
    return NextResponse.json({ message: 'Failed to delete code example.' }, { status: 500 });
  }
}
