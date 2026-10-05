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
 * Each known badge gets a bold icon on a glossy brand-blue tile. The stored
 * icons are thin 30px line drawings that read as clip-art at this size; a
 * badge added in the admin that is not listed here still shows its own icon.
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
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-50">
        <Image src={imageUrl(badge.icon)} alt="" width={30} height={30} className="h-7 w-7 object-contain" />
      </span>
    );
  }

  const { Icon } = look;
  return (
    <span
      className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-linear-to-br from-primary-500 to-primary-700 text-white transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:rotate-[-4deg]"
      style={{ boxShadow: '0 10px 20px -8px rgb(11 97 130 / 0.45), inset 0 1px 0 rgb(255 255 255 / 0.35)' }}
    >
      {/* glossy highlight across the top half — what makes the tile read as
          an object rather than a flat swatch */}
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1/2 bg-linear-to-b from-white/35 to-transparent" />
      <Icon size={22} strokeWidth={2.1} aria-hidden="true" className="relative drop-shadow-[0_1px_1px_rgb(0_0_0/0.25)]" />
    </span>
  );
}

export default function TrustBadges({ badges = [] }) {
  if (!badges.length) return null;

  return (
    <section className="bg-white">
      <div className="df-container py-3 md:py-4">
        <div className="rounded-3xl border border-[#e6eef2] sm:mx-12 bg-linear-to-br from-[#f6fafc] via-white to-[#f2f8fb] p-2 shadow-[0_20px_50px_-36px_rgb(6_59_76/0.45)] md:p-3">
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 lg:gap-0">
            {badges.map((b, i) => (
              <Reveal
                as="li"
                key={b.title}
                delay={(i % 6) * 60}
                // thin dividers between items on the single desktop row
                className="relative lg:[&:not(:first-child)]:before:absolute lg:[&:not(:first-child)]:before:inset-y-5 lg:[&:not(:first-child)]:before:left-0 lg:[&:not(:first-child)]:before:w-px lg:[&:not(:first-child)]:before:bg-[#e3ecf0] lg:[&:not(:first-child)]:before:content-['']"
              >
                <div className="group flex h-full flex-col items-center gap-3 rounded-2xl px-3 py-5 text-center transition-colors duration-200 hover:bg-white lg:py-6">
                  <BadgeIcon badge={b} />
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold leading-tight tracking-[-0.01em] text-ink-900">
                      {b.title}
                    </span>
                    <span className="mt-1 block text-[12.5px] leading-snug text-ink-400">
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
