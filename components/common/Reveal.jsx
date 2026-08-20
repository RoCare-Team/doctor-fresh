'use client';

import { useEffect, useRef } from 'react';

/**
 * Scroll reveal: fades and lifts its children into place the first time they
 * enter the viewport, then stops observing.
 *
 * One shared IntersectionObserver serves every instance on the page, so a
 * category grid with 80 cards still costs a single observer. The motion itself
 * is a plain CSS transition, and the global prefers-reduced-motion rule turns
 * it off for anyone who asks.
 */
let observer = null;

function getObserver() {
  if (observer || typeof window === 'undefined') return observer;

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );

  return observer;
}

export default function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...rest }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    // already on screen at mount (above the fold) — show it without waiting
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) {
      el.classList.add('is-visible');
      return undefined;
    }

    const io = getObserver();
    io?.observe(el);
    return () => io?.unobserve(el);
  }, []);

  return (
    <Tag
      ref={ref}
      className={`df-reveal ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}
