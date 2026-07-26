import { getPullRequestDiff } from '@/lib/github';
import { summarizePR } from '@/lib/summarize';
import { requireUser } from '@/lib/supabase/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ number: string }> },
) {
  if (!(await requireUser())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { number } = await params;
  try {
    const diff = await getPullRequestDiff(Number(number));
    const summary = await summarizePR(diff);
    return Response.json({ summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 502 });
  }
}
