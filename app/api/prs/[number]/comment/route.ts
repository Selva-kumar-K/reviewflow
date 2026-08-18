import { commentOnPullRequest } from '@/lib/github';
import { requireUser } from '@/lib/supabase/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ number: string }> },
) {
  if (!(await requireUser())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { number } = await params;
  const { body } = (await request.json()) as { body: string };

  if (!body || body.trim().length === 0) {
    return Response.json({ error: 'Comment cannot be empty' }, { status: 400 });
  }

  try {
    await commentOnPullRequest(Number(number), body);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'GitHub request failed';
    return Response.json({ error: message }, { status: 502 });
  }

  return Response.json({ ok: true });
}
