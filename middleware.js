// Applies the redirect rules managed in /admin/redirects to live traffic.
//
// Runs on the Node.js runtime (stable since Next.js 15.5) so it can read the
// rules from MySQL; they are cached in memory, so a normal page view costs a
// Map lookup, not a query.

import { NextResponse } from 'next/server';
import { redirectFor } from '@/lib/sql/redirects';

export const config = {
  runtime: 'nodejs',
  // Framework internals, the API, the admin and uploaded media never redirect.
  matcher: ['/((?!_next/|api/|admin|uploads/|images/|favicon).*)'],
};

// A file request (image, script, sitemap…) is not a page. Old page extensions
// are the exception: "/about.php" is exactly what an old link looks like.
const FILE = /\.[a-z0-9]{2,5}$/i;
const PAGE_EXTENSION = /\.(php|html?|aspx?|jsp)$/i;

function goneOrMissing(status) {
  const title = status === 410 ? 'This page has been removed' : 'Page not found';
  const body = status === 410
    ? 'The page you are looking for is no longer available.'
    : 'We could not find the page you are looking for.';

  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title} | Doctor Fresh</title><style>body{margin:0;font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#f3fafd;color:#063b4c;display:grid;place-items:center;min-height:100vh;padding:24px;box-sizing:border-box;text-align:center}main{max-width:440px}b{display:block;font-size:64px;color:#1597c5;line-height:1}h1{font-size:24px;margin:16px 0 8px}p{color:#4a6470;margin:0 0 24px}a{display:inline-block;background:#1597c5;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600}</style></head><body><main><b>${status}</b><h1>${title}</h1><p>${body}</p><a href="/">Go to the home page</a></main></body></html>`,
    {
      status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Robots-Tag': 'noindex',
        'Cache-Control': 'public, max-age=300',
      },
    },
  );
}

export async function middleware(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (pathname === '/' || (FILE.test(pathname) && !PAGE_EXTENSION.test(pathname))) {
    return NextResponse.next();
  }

  let rule;
  try {
    rule = await redirectFor(pathname);
  } catch {
    // Rules unavailable: serve the page rather than fail the request.
    return NextResponse.next();
  }
  if (!rule) return NextResponse.next();

  if (rule.type === 404 || rule.type === 410) return goneOrMissing(rule.type);

  const target = new URL(rule.destination, request.url);
  // Keep the visitor's query (utm tags, filters) unless the rule sets its own.
  if (!target.search && search) target.search = search;
  // Never answer a page with a redirect to itself.
  if (target.origin === request.nextUrl.origin && target.pathname === pathname && target.search === search) {
    return NextResponse.next();
  }

  return NextResponse.redirect(target, rule.type === 302 ? 302 : 301);
}
