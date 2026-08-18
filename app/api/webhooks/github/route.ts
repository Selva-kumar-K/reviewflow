import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  // Raw text, read BEFORE any JSON parsing — HMAC verification has to run
  // against the exact bytes GitHub signed, not a re-serialized object.
  const rawBody = await request.text();
  const signature = request.headers.get('x-hub-signature-256');

  if (!signature || !isValidSignature(rawBody, signature)) {
    return new Response('Invalid signature', { status: 401 });
  }

  if (request.headers.get('x-github-event') !== 'pull_request') {
    return Response.json({ ok: true, skipped: true });
  }

  const pr = JSON.parse(rawBody).pull_request;

  const { error } = await createAdminClient()
    .from('pull_requests')
    .upsert({
      number: pr.number,
      title: pr.title,
      author: pr.user.login,
      author_avatar_url: pr.user.avatar_url,
      state: pr.state,
      is_merged: pr.merged_at !== null,
      created_at: pr.created_at,
      url: pr.html_url,
    });

  if (error) {
    return Response.json({ error: error.message }, { status: 502 });
  }
  return Response.json({ ok: true });
}

function isValidSignature(rawBody: string, header: string): boolean {
  const expected =
    'sha256=' +
    crypto
      .createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET!)
      .update(rawBody)
      .digest('hex');

  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(header);
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}
