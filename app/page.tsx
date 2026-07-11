import { getPullRequests } from '@/lib/github';
import { PrList } from '@/components/PrList';

export default async function Home() {
  const prs = await getPullRequests();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-xl font-semibold">Pull Requests</h1>
      <PrList prs={prs} />
    </main>
  );
}
