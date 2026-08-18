import { getPullRequestComments } from '@/lib/github';
import { requireUser } from '@/lib/supabase/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ number: string }> },
) {
  if (!(await requireUser())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { number } = await params;
  const comments = await getPullRequestComments(Number(number));
  return Response.json(comments);
}
