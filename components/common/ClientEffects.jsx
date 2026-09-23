'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * The two page-wide behaviours that used to live on every element:
 *
 *  • Scroll reveal — one IntersectionObserver for every .df-reveal on the
 *    page. What is on screen at the start is left alone; the rest is hidden
 *    (while out of sight) and faded in when it is scrolled to. The observer
 *    reports what is visible on its own, so nothing has to measure the page —
 *    measuring per element forced a full layout each time, which on a long
 *    page cost more than everything else put together.
 *
 *  • Link prefetch on hover — one listener for the whole document rather than
 *    a component around every link. Pages are not fetched just for being on
 *    screen (that was a megabyte on a phone); the one under the pointer is.
 */
export default function ClientEffects() {
  const router = useRouter();

  useEffect(() => {
    const seen = new WeakSet();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target;
          // Anything already on screen (even at the very bottom edge) stays as
          // the server sent it; only what is truly below the fold is hidden.
          const below = entry.boundingClientRect.top > (entry.rootBounds?.bottom ?? window.innerHeight);
          if (entry.isIntersecting || !below) {
            el.classList.add('is-visible');
            observer.unobserve(el);
          } else if (!seen.has(el)) {
            seen.add(el);
            el.classList.add('df-reveal-wait');
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );

    const watch = (root) => {
      for (const el of root.querySelectorAll?.('.df-reveal:not(.is-visible)') || []) observer.observe(el);
    };
    watch(document);

    // Rails, filtered grids and dialogs add more of them as people move around.
    const added = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.classList?.contains('df-reveal')) observer.observe(node);
          watch(node);
        }
      }
    });
    added.observe(document.body, { childList: true, subtree: true });

    return () => { observer.disconnect(); added.disconnect(); };
  }, []);

  useEffect(() => {
    const asked = new Set();
    function onPoint(event) {
      const a = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const href = a.getAttribute('href') || '';
      if (!href.startsWith('/') || href.startsWith('//') || asked.has(href)) return;
      asked.add(href);
      try { router.prefetch(href); } catch { /* a route that cannot be prefetched */ }
    }
    document.addEventListener('mouseover', onPoint, { passive: true });
    document.addEventListener('touchstart', onPoint, { passive: true });
    return () => {
      document.removeEventListener('mouseover', onPoint);
      document.removeEventListener('touchstart', onPoint);
    };
  }, [router]);

  return null;
}
