import { getPullRequests } from '@/lib/github';

export async function GET() {
  const prs = await getPullRequests();
  return Response.json(prs);
}
