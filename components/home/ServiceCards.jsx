import Link from '@/components/common/NavLink'; // no prefetch until hovered
import {
  ArrowRight, CalendarCheck, ShieldCheck, Wrench, Hammer,
} from 'lucide-react';
import Reveal from '@/components/common/Reveal';

/**
 * The four things people come to a water purifier company for.
 *
 * Half our visitors are not shopping — they have a purifier that has stopped
 * working, and until now the home page only sold them a new one. Each card
 * lands on the page that books that job, so the booking flow is reachable from
 * the first screen instead of only from a search result.
 */
const SERVICES = [
  {
    icon: CalendarCheck,
    title: 'Routine Service',
    note: 'A serviced purifier cleans better and lasts longer. Filters checked, cleaned and replaced.',
    href: '/water-purifier-service',
    action: 'Book a service',
  },
  {
    icon: Wrench,
    title: 'Repair Service',
    note: 'Not purifying, leaking or making noise? A trained technician comes and fixes it.',
    href: '/water-purifier-service',
    action: 'Book a repair',
  },
  {
    icon: ShieldCheck,
    title: 'Water Purifier AMC',
    note: 'One yearly plan instead of a bill every time something goes wrong.',
    href: '/water-purifier-amc',
    action: 'See AMC plans',
  },
  {
    icon: Hammer,
    title: 'Installation & Uninstallation',
    note: 'Fitted where it belongs, or taken off the wall safely when you move.',
    href: '/water-purifier-installation',
    action: 'Book installation',
  },
];

export default function ServiceCards() {
  return (
    <section className="df-section df-container">
      <Reveal className="mb-8 max-w-2xl">
        <h2 className="text-[26px] font-semibold tracking-tight text-ink-900 md:text-[32px]">
          Water Purifier Services
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-400">
          Any brand, any model. Book a visit and a trained technician reaches you — usually the same day.
        </p>
      </Reveal>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SERVICES.map((s, i) => (
          <Reveal as="li" key={s.title} delay={i * 70} className="h-full">
            <Link
              href={s.href}
              className="group flex h-full flex-col rounded-2xl border border-line bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-[0_12px_28px_-16px_rgb(6_59_76/0.35)]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-700 transition-transform duration-200 group-hover:scale-105">
                <s.icon size={22} aria-hidden="true" />
              </span>

              <span className="mt-4 block text-[16px] font-semibold leading-tight text-ink-900">
                {s.title}
              </span>
              <span className="mt-2 block text-[13.5px] leading-relaxed text-ink-400">
                {s.note}
              </span>

              {/* Pushed to the bottom so the four cards line up however long
                  their descriptions are. */}
              <span className="mt-auto flex items-center gap-1.5 pt-4 text-[14px] font-medium text-primary-700">
                {s.action}
                <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </Link>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
