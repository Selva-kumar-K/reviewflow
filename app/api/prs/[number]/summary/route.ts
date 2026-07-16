import { getPullRequestDiff } from '@/lib/github';
import { summarizePR } from '@/lib/summarize';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ number: string }> },
) {
  const { number } = await params;
  const diff = await getPullRequestDiff(Number(number));
  const summary = await summarizePR(diff);
  return Response.json({ summary });
}
