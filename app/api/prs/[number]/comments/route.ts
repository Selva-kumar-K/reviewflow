import { getPullRequestComments } from '@/lib/github';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ number: string }> },
) {
  const { number } = await params;
  const comments = await getPullRequestComments(Number(number));
  return Response.json(comments);
}
