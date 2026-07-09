import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ message: 'Username and password are required' }, { status: 400 });
    }

    // Query user from Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, password, role, approved, can_view, can_edit, can_delete')
      .eq('username', username.trim())
      .maybeSingle();

    if (error) {
      console.error('Supabase query error during login:', error);
      throw error;
    }

    if (!user) {
      return NextResponse.json({ message: 'Invalid username or password' }, { status: 401 });
    }

    // Check plaintext password (dont encrypt the pass as requested)
    if (user.password !== password) {
      return NextResponse.json({ message: 'Invalid username or password' }, { status: 401 });
    }

    // Check if approved
    if (!user.approved) {
      return NextResponse.json({ message: 'Your account is pending approval by the admin.' }, { status: 403 });
    }

    // Success - return user without password
    const { password: _, ...userWithoutPassword } = user;
    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
