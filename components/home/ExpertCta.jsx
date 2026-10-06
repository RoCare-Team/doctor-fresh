import Link from '@/components/common/NavLink'; // no prefetch until hovered
import { ArrowRight, Droplets, Phone } from 'lucide-react';

/**
 * "Not sure which purifier suits your water?" — the expert-call banner near
 * the foot of the home page. Kept to one short band: icon, headline and line
 * of copy on the left, the two actions on the right.
 *
 * Inset by the same gutter (sm:px-12) as the rails above it, so its edges
 * line up with theirs.
 */
export default function ExpertCta({ phone, phoneRaw }) {
  return (
    <section className="df-container df-section">
      <div className="sm:px-12">
        <div className="relative overflow-hidden rounded-2xl bg-ink-900 px-5 py-6 sm:px-8 md:py-7 lg:px-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary-500/20 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-primary-400/10 blur-3xl"
          />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
            <div className="flex items-center gap-4">
              <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white shadow-[0_8px_20px_-8px_rgb(21_151_197/0.7)] sm:flex">
                <Droplets size={22} aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-[20px] font-semibold leading-tight tracking-tight text-white md:text-[24px]">
                  Not sure which purifier suits <span className="text-primary-300">your water?</span>
                </h2>
                <p className="mt-1.5 max-w-xl text-[14.5px] leading-relaxed text-white/65">
                  Talk to a Doctor Fresh water expert — free consultation, honest recommendation
                  based on your actual water quality.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-3">
              <a
                href={`tel:${phoneRaw}`}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary-600 px-5 text-[15px] font-semibold text-white transition-colors hover:bg-primary-500"
              >
                <Phone size={16} aria-hidden="true" />
                Call {phone}
              </a>
              <Link
                href="/contact"
                className="group inline-flex h-11 items-center gap-1.5 rounded-xl border border-white/25 px-5 text-[15px] font-medium text-white transition-colors hover:border-white/50 hover:bg-white/5"
              >
                Request a callback
                <ArrowRight size={15} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
