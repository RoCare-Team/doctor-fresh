import Image from 'next/image';
import {
  Truck, RotateCcw, Wrench, CreditCard, Clock, PackageSearch,
} from 'lucide-react';
import { imageUrl } from '@/lib/utils';
import Reveal from '@/components/common/Reveal';

// Supporting line for each existing badge — copy only, no new functionality.
const SUPPORT = {
  'Free Shipping': 'On all orders across India',
  'Money Back Guarantee': 'Hassle-free returns policy',
  'Free Installation': 'By certified technicians',
  'Easy EMI Options': 'On leading cards & wallets',
  'Service Within 24 Hour': 'Nationwide service network',
  'Online Order Tracking': 'Track every order & service',
};

/**
 * Each known badge gets a brand-blue line icon on a white tile. The stored
 * icons are thin 30px line drawings that read as clip-art at this size; a
 * badge added in the admin that is not listed here still shows its own icon.
 *
 * The tiles were solid blue blocks, which on a page of white cards read as six
 * loud squares rather than as six quiet marks; only the drawing is blue now.
 */
const LOOK = {
  'Free Shipping': { Icon: Truck },
  'Money Back Guarantee': { Icon: RotateCcw },
  'Free Installation': { Icon: Wrench },
  'Easy EMI Options': { Icon: CreditCard },
  'Service Within 24 Hour': { Icon: Clock },
  'Online Order Tracking': { Icon: PackageSearch },
};

function BadgeIcon({ badge }) {
  const look = LOOK[badge.title];

  if (!look) {
    return (
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-white">
        <Image src={imageUrl(badge.icon)} alt="" width={30} height={30} className="h-6 w-6 object-contain" />
      </span>
    );
  }

  const { Icon } = look;
  return (
    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-primary-700 shadow-[0_1px_2px_rgb(16_24_40/0.05)] transition-transform duration-300 group-hover:-translate-y-0.5">
      <Icon size={20} strokeWidth={2} aria-hidden="true" />
    </span>
  );
}

export default function TrustBadges({ badges = [] }) {
  if (!badges.length) return null;

  return (
    <section className="hidden bg-white sm:block">
      <div className="df-container py-4 md:py-6">
        {/* the strip sits on its own rounded panel, so the white cards read as
            a set rather than floating on the page */}
        <div className="rounded-2xl border border-line p-3 md:px-6 md:py-4">
          <ul className="df-no-scrollbar -mx-1 flex snap-x snap-mandatory gap-3 -my-2 overflow-x-auto px-1 py-2 sm:mx-0 sm:my-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:py-0 lg:grid-cols-6">
            {badges.map((b, i) => (
              <Reveal as="li" key={b.title} delay={(i % 6) * 60} className="flex w-[40%] shrink-0 snap-start sm:h-full sm:w-auto">
                <div className="group flex h-full w-full flex-col items-center gap-2 rounded-xl bg-white px-2 py-3 text-center shadow-[0_1px_3px_rgb(16_24_40/0.08),0_10px_24px_-6px_rgb(16_24_40/0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_5px_rgb(16_24_40/0.10),0_18px_36px_-10px_rgb(16_24_40/0.28)]">
                  <BadgeIcon badge={b} />

                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold leading-tight tracking-[-0.01em] text-ink-900">
                      {b.title}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-400">
                      {SUPPORT[b.title] || ''}
                    </span>
                  </span>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
