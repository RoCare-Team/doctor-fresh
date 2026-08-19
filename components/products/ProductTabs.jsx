'use client';

import { useState } from 'react';
import { cx } from '@/lib/utils';

/**
 * Every panel stays in the DOM and is hidden with `hidden` rather than being
 * conditionally rendered, so specifications and features remain crawlable.
 */
export default function ProductTabs({ tabs = [] }) {
  const available = tabs.filter((t) => t.content);
  const [active, setActive] = useState(available[0]?.id);
  if (!available.length) return null;

  const currentId = available.some((t) => t.id === active) ? active : available[0].id;

  return (
    <section className="border-t border-line pt-8">
      <div
        role="tablist"
        aria-label="Product information"
        className="df-no-scrollbar -mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-line px-4 md:mx-0 md:px-0"
      >
        {available.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-controls={`panel-${t.id}`}
            aria-selected={t.id === currentId}
            onClick={() => setActive(t.id)}
            className={cx(
              'relative whitespace-nowrap px-4 py-3 text-[15px] font-medium transition-colors',
              t.id === currentId ? 'text-primary-700' : 'text-ink-400 hover:text-ink-700',
            )}
          >
            {t.label}
            {t.id === currentId ? (
              <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary-500" />
            ) : null}
          </button>
        ))}
      </div>

      {available.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`panel-${t.id}`}
          aria-labelledby={`tab-${t.id}`}
          hidden={t.id !== currentId}
        >
          {t.content}
        </div>
      ))}
    </section>
  );
}
