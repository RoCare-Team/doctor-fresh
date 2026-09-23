import Link from 'next/link';

/**
 * A Link for menus, cards and the footer: it does not fetch its page just
 * because the link is on screen.
 *
 * Next prefetches every visible link's page as it renders — for the dozens of
 * links on a page that was about a megabyte downloaded per page view, and a
 * server render of each of those pages. The page under the pointer is still
 * fetched ahead of the click, by the one document-wide listener in
 * ClientEffects, so moving around the site stays quick.
 */
export default function NavLink(props) {
  return <Link prefetch={false} {...props} />;
}
