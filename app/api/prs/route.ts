export async function GET() {
  const res = await fetch(
    'https://api.github.com/repos/Selva-kumar-K/reviewflow/pulls?state=all',
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
      cache: 'no-store',
    }
  );

  const pulls = await res.json();
  const prs = pulls.map((pr: { number: number; title: string }) => ({
    number: pr.number,
    title: pr.title,
  }));

  return Response.json(prs);
}
