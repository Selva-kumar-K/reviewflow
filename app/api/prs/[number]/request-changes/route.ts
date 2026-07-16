import { requestChangesOnPullRequest } from '@/lib/github';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ number: string }> },
) {
  const { number } = await params;
  const { body } = (await request.json()) as { body: string };

  if (!body || body.trim().length === 0) {
    return Response.json({ error: 'Review body cannot be empty' }, { status: 400 });
  }

  try {
    await requestChangesOnPullRequest(Number(number), body);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'GitHub request failed';
    return Response.json({ error: message }, { status: 502 });
  }

  return Response.json({ ok: true });
}
