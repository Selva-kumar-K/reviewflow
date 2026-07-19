import { getPullRequests } from '@/lib/github';
import { PrList } from '@/components/PrList';
import { SignInButton } from '@/components/SignInButton';
import { SignOutButton } from '@/components/SignOutButton';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-4 py-20 text-center">
        <h1 className="text-xl font-semibold">ReviewFlow</h1>
        <p className="text-sm text-gray-500">
          Sign in to see open pull requests.
        </p>
        <SignInButton />
      </main>
    );
  }

  const prs = await getPullRequests();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Pull Requests</h1>
        <SignOutButton />
      </div>
      <PrList prs={prs} />
    </main>
  );
}
