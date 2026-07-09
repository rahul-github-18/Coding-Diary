import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function DELETE(req, { params }) {
  const requestStart = Date.now();
  const { id } = params;
  console.log(`[API DELETE /api/shared-codes/${id}] Start`);
  try {
    console.time(`Supabase Query: Delete Shared Code ${id}`);
    const queryStart = Date.now();
    const { data: deletedSnippet, error } = await supabase
      .from('shared_codes')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();
    console.timeEnd(`Supabase Query: Delete Shared Code ${id}`);
    const queryEnd = Date.now();
    console.log(`[API DELETE /api/shared-codes/${id}] Supabase query execution time: ${queryEnd - queryStart} ms`);

    if (error) throw error;

    if (!deletedSnippet) {
      return NextResponse.json({ message: 'Shared code not found or already expired.' }, { status: 404 });
    }

    const requestEnd = Date.now();
    console.log(`[API DELETE /api/shared-codes/${id}] API execution time: ${requestEnd - requestStart} ms`);
    console.log(`[API DELETE /api/shared-codes/${id}] Total request time: ${requestEnd - requestStart} ms`);

    return NextResponse.json({ message: 'Shared code deleted successfully.' });
  } catch (error) {
    console.error('Error deleting shared code:', error);
    return NextResponse.json({ message: 'Failed to delete the shared code.' }, { status: 500 });
  }
}
