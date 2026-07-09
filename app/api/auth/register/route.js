import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ message: 'Username and password are required' }, { status: 400 });
    }

    if (username.trim().toLowerCase() === 'admin') {
      return NextResponse.json({ message: 'Cannot register with the username "admin"' }, { status: 400 });
    }

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username.trim())
      .maybeSingle();

    if (checkError) throw checkError;

    if (existingUser) {
      return NextResponse.json({ message: 'Username is already taken' }, { status: 400 });
    }

    // Insert user (not encrypted as requested)
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        username: username.trim(),
        password: password,
        role: 'user',
        approved: false,
        can_view: true,
        can_edit: false,
        can_delete: false
      });

    if (insertError) throw insertError;

    return NextResponse.json(
      { message: 'Enrollment successful! Your account is pending admin approval.' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
