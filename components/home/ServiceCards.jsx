import Link from '@/components/common/NavLink'; // no prefetch until hovered
import Image from 'next/image';
import {
  ArrowRight, CalendarCheck, Check, ShieldCheck, Wrench, Hammer,
} from 'lucide-react';
import Reveal from '@/components/common/Reveal';

/**
 * The four things people come to a water purifier company for.
 *
 * Half our visitors are not shopping — they have a purifier that has stopped
 * working, and until now the home page only sold them a new one. Each card
 * lands on the page that books that job, so the booking flow is reachable from
 * the first screen instead of only from a search result.
 *
 * A card shows a photo above its text when `image` is set (with `focus` for
 * where to crop it); without one it stands on its icon alone.
 */
const SERVICES = [
  {
    icon: CalendarCheck,
    title: 'Routine Service',
    image: null,
    focus: 'object-center',
    note: 'A serviced purifier cleans better and lasts longer. Filters checked, cleaned and replaced.',
    points: ['Filters checked & cleaned', 'Any brand, any model'],
    href: '/water-purifier-service',
    action: 'Book a service',
  },
  {
    icon: Wrench,
    title: 'Repair Service',
    image: null,
    focus: 'object-center',
    note: 'Not purifying, leaking or making noise? A trained technician comes and fixes it.',
    points: ['Diagnosis at your doorstep', 'Service within 24 hours'],
    href: '/water-purifier-service',
    action: 'Book a repair',
  },
  {
    icon: ShieldCheck,
    title: 'Water Purifier AMC',
    image: null,
    focus: 'object-center',
    note: 'One yearly plan instead of a bill every time something goes wrong.',
    points: ['Planned service visits', 'One yearly price'],
    href: '/water-purifier-amc',
    action: 'See AMC plans',
  },
  {
    icon: Hammer,
    title: 'Installation & Uninstallation',
    image: null,
    focus: 'object-center',
    note: 'Fitted where it belongs, or taken off the wall safely when you move.',
    points: ['Certified technicians', 'Safe wall mounting'],
    href: '/water-purifier-installation',
    action: 'Book installation',
  },
];

export default function ServiceCards() {
  return (
    <section className="df-section df-container">
      {/* inset like the rows above, so every heading starts on one line */}
      <Reveal className="mb-4 flex flex-wrap items-end justify-between gap-4 md:mb-5">
        <div className="max-w-2xl">
          {/* the heading, with the promise as a quiet aside */}
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-[26px] font-semibold tracking-tight text-ink-900 md:text-[32px]">
              Water Purifier <span className="text-primary-600">Services</span>
            </h2>
            <span className="border-l border-line-strong pl-3 text-[14px] font-medium text-ink-400">
              At your doorstep
            </span>
          </div>
          <p className="mt-1 text-[14.5px] text-ink-400">
            Any brand, any model. Book a visit and a trained technician reaches you — usually the same day.
          </p>
        </div>
      </Reveal>

      <ul className="df-no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 py-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:py-0 lg:grid-cols-4 xl:gap-5">
        {SERVICES.map((s, i) => (
          <Reveal as="li" key={s.title} delay={i * 70} className="h-full w-[82%] shrink-0 snap-start sm:w-auto">
            <Link
              href={s.href}
              className="group flex h-full flex-col rounded-2xl border border-line bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_14px_30px_-18px_rgb(15_23_42/0.22)]"
            >
              <span className="flex flex-1 flex-col">
                <span className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-700 ring-1 ring-primary-100 transition-colors duration-300 group-hover:bg-primary-600 group-hover:text-white group-hover:ring-primary-600">
                    <s.icon size={20} aria-hidden="true" />
                  </span>
                  {/* the card's place in the four, as a quiet marker */}
                  <span aria-hidden="true" className="text-[13px] font-semibold tabular-nums text-ink-300">
                    0{i + 1}
                  </span>
                </span>

                <span className="mt-3 block text-[16.5px] font-semibold leading-tight tracking-[-0.01em] text-ink-900 transition-colors group-hover:text-primary-700">
                  {s.title}
                </span>
                {/* three lines held open on a desktop, so the points line up across the row */}
                <span className="mt-1.5 block text-[13.5px] leading-relaxed text-ink-400 lg:min-h-[4.875em]">
                  {s.note}
                </span>

                <span className="mt-3.5 block space-y-1.5 border-t border-[#eef2f4] pt-3.5">
                  {s.points.map((p) => (
                    <span key={p} className="flex items-center gap-2 text-[13px] font-medium text-ink-700">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#e8f7ee] text-[#15803d]">
                        <Check size={11} strokeWidth={3} aria-hidden="true" />
                      </span>
                      {p}
                    </span>
                  ))}
                </span>

                {/* Pushed to the bottom so the four cards line up however long
                    their descriptions are. */}
                <span className="mt-auto pt-4">
                  <span className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-primary-600 text-[13.5px] font-semibold text-primary-700 transition-colors group-hover:bg-primary-600 group-hover:text-white">
                    {s.action}
                    <ArrowRight size={14} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </span>
              </span>
            </Link>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
