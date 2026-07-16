import { mergePullRequest, type MergeMethod } from '@/lib/github';

const VALID_METHODS: MergeMethod[] = ['merge', 'squash', 'rebase'];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ number: string }> },
) {
  const { number } = await params;
  const { mergeMethod } = (await request.json()) as { mergeMethod?: string };

  const method = VALID_METHODS.includes(mergeMethod as MergeMethod)
    ? (mergeMethod as MergeMethod)
    : 'squash';

  try {
    await mergePullRequest(Number(number), method);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'GitHub request failed';
    return Response.json({ error: message }, { status: 502 });
  }

  return Response.json({ ok: true });
}
