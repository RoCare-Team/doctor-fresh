'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

/**
 * A Link for menus and the footer: it does not fetch its page just because
 * the link is on screen, only when the pointer rests on it.
 *
 * Next prefetches every visible link's page as it renders. For the dozen
 * menu links on every page (including the closed mobile menu) that was about
 * a megabyte downloaded on each page view, competing with the page's own
 * pictures on a phone. On hover the page is still fetched ahead of the click,
 * so moving around the site stays quick on a desktop.
 */
export default function NavLink({ href, onMouseEnter, ...rest }) {
  const router = useRouter();
  return (
    <Link
      href={href}
      prefetch={false}
      onMouseEnter={(event) => {
        if (typeof href === 'string' && href.startsWith('/')) router.prefetch(href);
        onMouseEnter?.(event);
      }}
      {...rest}
    />
  );
}
