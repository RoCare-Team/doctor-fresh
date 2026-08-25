// Blog comments and replies, keyed by the article URL.

import { isDbEnabled } from '@/lib/db';
import { getComments, createComment, createCommentReply } from '@/lib/sql/engagement';
import { normaliseEmail, normaliseName } from '@/lib/auth/users';
import { SITE_URL } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const fail = (message, status = 400) => Response.json({ ok: false, error: message }, { status });

/** Comments are stored against the absolute URL the PHP site uses. */
const absolute = (path) => `${SITE_URL}${String(path || '').startsWith('/') ? '' : '/'}${path || ''}`;

export async function GET(request) {
  const path = new URL(request.url).searchParams.get('path') || '';
  if (!path) return Response.json({ comments: [] });
  return Response.json({ comments: await getComments(absolute(path)) });
}

export async function POST(request) {
  if (!isDbEnabled()) return fail('Comments are unavailable right now.', 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request.');
  }

  const name = normaliseName(body.name);
  if (!name) return fail('Enter your name.');

  const email = normaliseEmail(body.email);
  if (!email) return fail('Enter a valid email address.');

  const text = String(body.comment ?? body.reply ?? '').trim();
  if (text.length < 3) return fail('Write something first.');

  const url = absolute(body.path);

  try {
    if (body.commentId) {
      await createCommentReply({ commentId: body.commentId, url, name, email, reply: text });
    } else {
      await createComment({ url, name, email, comment: text });
    }
  } catch (err) {
    console.error('[comments] could not save:', err.message);
    return fail('Could not post your comment. Please try again.', 502);
  }

  return Response.json({ ok: true, comments: await getComments(url) });
}
