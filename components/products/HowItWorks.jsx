import { ArrowRight } from 'lucide-react';
import { purificationSteps } from '@/lib/product-tech';
import { cx } from '@/lib/utils';

/**
 * One glass of water, from the tap to the glass.
 *
 * The stages are this product's own — read from its name — so a UV+UF machine
 * does not claim an RO membrane it does not have. Numbered, because the order
 * is the point: each stage only works on what the one before it left.
 */
export default function HowItWorks({ name }) {
  const steps = purificationSteps(name);
  if (steps.length < 3) return null;

  return (
    <section className="rounded-2xl border border-line bg-white p-4 sm:p-5">
      <h2 className="text-[17px] font-semibold tracking-tight text-ink-900">How it works</h2>
      <p className="mt-1 text-[13.5px] text-ink-400">
        See how Doctor Fresh purifies your water, stage by stage.
      </p>

      <ol
        className={cx(
          "mt-4 grid gap-3 sm:grid-cols-2",
          steps.length % 4 === 0 ? "lg:grid-cols-4" : steps.length % 3 === 0 ? "lg:grid-cols-3" : "lg:grid-cols-5",
        )}
      >
        {steps.map((step, i) => (
          <li
            key={step.title}
            className="relative flex flex-col rounded-xl border border-line px-3.5 py-3.5"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-600 text-[12.5px] font-bold text-white">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="mt-2.5 block text-[14px] font-semibold leading-tight text-ink-900">
              {step.title}
            </span>
            <span className="mt-1 block text-[12.5px] leading-snug text-ink-500">{step.note}</span>

            {/* The arrow belongs between two cards, so the last one has none. */}
            {i < steps.length - 1 ? (
              <span
                aria-hidden="true"
                className="absolute -right-2.5 top-1/2 hidden h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white text-ink-300 lg:flex"
              >
                <ArrowRight size={12} />
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
