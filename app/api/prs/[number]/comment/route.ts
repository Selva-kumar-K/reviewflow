import { commentOnPullRequest } from '@/lib/github';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ number: string }> },
) {
  const { number } = await params;
  const { body } = (await request.json()) as { body: string };

  if (!body || body.trim().length === 0) {
    return Response.json({ error: 'Comment cannot be empty' }, { status: 400 });
  }

  await commentOnPullRequest(Number(number), body);
  return Response.json({ ok: true });
}
