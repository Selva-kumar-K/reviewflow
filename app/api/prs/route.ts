import { getPullRequests } from '@/lib/github';
import { requireUser } from '@/lib/supabase/server';

export async function GET() {
  if (!(await requireUser())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const prs = await getPullRequests();
  return Response.json(prs);
}
