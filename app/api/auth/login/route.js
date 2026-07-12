import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  console.time('API: POST /api/auth/login');
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      console.timeEnd('API: POST /api/auth/login');
      return NextResponse.json({ message: 'Username and password are required' }, { status: 400 });
    }

    // Query user from Supabase
    console.time('Supabase: Fetch user (login)');
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, password, role, approved, can_view, can_edit, can_delete')
      .eq('username', username.trim())
      .maybeSingle();
    console.timeEnd('Supabase: Fetch user (login)');

    if (error) {
      console.error('Supabase query error during login:', error);
      throw error;
    }

    if (!user) {
      console.timeEnd('API: POST /api/auth/login');
      return NextResponse.json({ message: 'Invalid username or password' }, { status: 401 });
    }

    // Check plaintext password (dont encrypt the pass as requested)
    if (user.password !== password) {
      console.timeEnd('API: POST /api/auth/login');
      return NextResponse.json({ message: 'Invalid username or password' }, { status: 401 });
    }

    // Success - return user without password
    const { password: _, ...userWithoutPassword } = user;

    // Log login activity asynchronously but wait or handle safely
    try {
      const userAgent = req.headers.get('user-agent') || 'Unknown';
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'Unknown';
      await supabase
        .from('login_history')
        .insert({
          user_id: user.id,
          ip_address: ip,
          user_agent: userAgent
        });
    } catch (logError) {
      console.error('Failed to log login history:', logError);
    }

    console.timeEnd('API: POST /api/auth/login');
    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error('Login error:', error);
    console.timeEnd('API: POST /api/auth/login');
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
