'use client';

import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

/**
 * FAQ accordion. `items` = [{ question, answer }] or [{ question, answerHtml }].
 */
export default function Accordion({ items = [], defaultOpen = 0 }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!items.length) return null;

  return (
    <div className="divide-y divide-line overflow-hidden df-card">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={`${item.question}-${i}`}>
            <h3>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? -1 : i)}
                aria-expanded={isOpen}
                className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-surface-muted md:px-5"
              >
                <span className="text-[16px] font-medium text-ink-900">{item.question}</span>
                <span className="mt-0.5 shrink-0 text-primary-700">
                  {isOpen ? <Minus size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
                </span>
              </button>
            </h3>
            {isOpen ? (
              <div className="df-prose px-4 pb-5 md:px-5">
                {item.answerHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: item.answerHtml }} />
                ) : (
                  <p>{item.answer}</p>
                )}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
