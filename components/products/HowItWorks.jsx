import {
  ArrowRight, Droplets, Layers, Sun, Filter, Gauge, Sparkles, Leaf, Gem, GlassWater, ShieldCheck,
} from 'lucide-react';
import { purificationSteps } from '@/lib/product-tech';
import { cx } from '@/lib/utils';

/*
 * The band under the buy box: how the water is cleaned.
 *
 * The stages are this product's own — read from its name — so a UV+UF machine
 * does not claim an RO membrane it does not have. Numbered, because the order
 * is the point: each stage only works on what the one before it left.
 */

// A picture for each stage: an icon on its own tint, keyed by the stage name.
const STAGE_LOOK = [
  { match: /tap/i, Icon: Droplets, tint: 'from-[#e8eef3] to-[#f5f8fa] text-[#5b7083]' },
  { match: /\bRO\b/i, Icon: Layers, tint: 'from-[#dff0fb] to-[#f0f8fd] text-primary-600' },
  { match: /UV/i, Icon: Sun, tint: 'from-[#e4e3fb] to-[#f3f2fe] text-[#5b50d6]' },
  { match: /UF|filtration/i, Icon: Filter, tint: 'from-[#ddf3f4] to-[#f0fafa] text-[#0f8a8f]' },
  { match: /TDS/i, Icon: Gauge, tint: 'from-[#e5f0fb] to-[#f3f8fd] text-[#2563eb]' },
  { match: /alkaline/i, Icon: Sparkles, tint: 'from-[#e7f6ec] to-[#f3fbf6] text-success' },
  { match: /copper/i, Icon: Leaf, tint: 'from-[#fbeadd] to-[#fdf5ee] text-[#b45f1c]' },
  { match: /mineral/i, Icon: Gem, tint: 'from-[#f1e6fa] to-[#f8f2fd] text-[#8a3fc4]' },
  { match: /clean|out/i, Icon: GlassWater, tint: 'from-[#dff0fb] to-[#f0f8fd] text-primary-600' },
];
const lookFor = (title) => STAGE_LOOK.find((l) => l.match.test(title))
  || { Icon: ShieldCheck, tint: 'from-[#dff0fb] to-[#f0f8fd] text-primary-600' };

function Card({ title, note, className = '', children }) {
  return (
    <section className={cx('rounded-2xl border border-line bg-white p-4 sm:p-5', className)}>
      <h2 className="text-[19px] font-semibold tracking-tight text-ink-900">{title}</h2>
      <p className="mt-0.5 text-[13.5px] text-ink-400">{note}</p>
      {children}
    </section>
  );
}

function Steps({ steps }) {
  return (
    <ol className={cx(
      'mt-4 grid grid-cols-2 gap-x-6 gap-y-4',
      steps.length === 3 ? 'sm:grid-cols-3' : steps.length === 4 ? 'sm:grid-cols-4' : steps.length === 5 ? 'sm:grid-cols-5' : 'sm:grid-cols-3 lg:grid-cols-6',
    )}
    >
      {steps.map((step, i) => {
        const { Icon, tint } = lookFor(step.title);
        return (
          <li key={step.title} className="relative flex flex-col overflow-visible rounded-xl border border-line bg-white">
            <span className={cx('flex h-20 items-center justify-center rounded-t-xl bg-linear-to-br', tint)}>
              <Icon size={34} strokeWidth={1.5} aria-hidden="true" />
            </span>
            <span className="-mt-4 ml-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-[12.5px] font-bold text-white ring-[3px] ring-white">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="px-3 pb-3 pt-1.5">
              <span className="block text-[14px] font-semibold leading-tight text-ink-900">{step.title}</span>
              <span className="mt-1 block text-[12.5px] leading-snug text-ink-500">{step.note}</span>
            </span>

            {/* The arrow belongs between two cards, so the last one has none. */}
            {i < steps.length - 1 ? (
              <ArrowRight
                size={18}
                strokeWidth={2.4}
                aria-hidden="true"
                className="absolute -right-[21px] top-10 hidden text-primary-600 sm:block"
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export default function HowItWorks({ name }) {
  const steps = purificationSteps(name);
  if (steps.length < 3) return null;

  return (
    <Card title="How it works" note="See how Doctor Fresh purifies your water, stage by stage.">
      <Steps steps={steps} />
    </Card>
  );
}
