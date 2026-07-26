import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { User } from '@supabase/supabase-js';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component render — Next.js only allows
            // setting cookies from a Route Handler or Server Action.
            // Middleware (added later) will refresh the session cookie instead.
          }
        },
      },
    }
  );
}

// Route handlers under app/api/prs/** are called directly by the browser and
// aren't covered by the page-level auth gate in app/page.tsx — each one must
// check for a signed-in user itself before touching GitHub/Gemini.
export async function requireUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
