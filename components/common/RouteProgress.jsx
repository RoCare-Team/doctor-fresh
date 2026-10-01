'use client';

// The thin bar across the top of the window while a page is on its way.
//
// Pages here are rendered on the server: pressing a category in the menu sends
// a request and the screen then sits perfectly still until the answer comes
// back. On a slow connection that reads as a dead link, and people press it
// again. The bar is the only thing saying "it is coming" — and it is the same
// sweeping bar the admin already uses, so the two halves of the site behave
// alike.
//
// It starts on the click rather than when the new page arrives — that is the
// moment of doubt — and stops when the address actually changes. A click that
// goes nowhere (a new tab, a download, the page you are already on) never
// starts it, and a navigation that somehow never lands gives up after ten
// seconds rather than leaving a bar running for ever.

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const GIVE_UP_MS = 10_000;

export default function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const here = `${pathname}?${searchParams}`;

  const [loading, setLoading] = useState(false);
  const timer = useRef(null);

  // Arrived.
  useEffect(() => {
    setLoading(false);
    clearTimeout(timer.current);
  }, [here]);

  useEffect(() => {
    const onClick = (event) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = event.target.closest?.('a');
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // The page they are already on: nothing is going to change.
      if (`${url.pathname}?${url.searchParams}` === here) return;

      setLoading(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setLoading(false), GIVE_UP_MS);
    };

    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      clearTimeout(timer.current);
    };
  }, [here]);

  if (!loading) return null;

  return (
    <span
      // Announced politely rather than interrupting: a hint, not a message
      // somebody has to hear in the middle of a sentence.
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] overflow-hidden bg-primary-100"
    >
      <span
        aria-hidden="true"
        className="df-progress block h-full w-1/3 rounded-full bg-linear-to-r from-primary-300 via-primary-600 to-primary-300"
      />
    </span>
  );
}
