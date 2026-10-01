import Image from 'next/image';
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

export default function TrustBadges({ badges = [] }) {
  if (!badges.length) return null;

  return (
    <section className="bg-white">
      <div className="df-container py-8 md:py-10">
        {/* the strip sits on its own rounded panel, so the white cards read as
            a set rather than floating on the page */}
        <div className="rounded-3xl border border-line p-4 md:p-6">
          <ul className="df-no-scrollbar -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-6 lg:gap-4">
            {badges.map((b, i) => (
              <Reveal as="li" key={b.title} delay={(i % 6) * 60} className="h-full w-[44%] shrink-0 snap-start sm:w-auto">
                <div className="group flex h-full flex-col items-center gap-3 rounded-2xl bg-white px-3 py-5 text-center shadow-[0_1px_3px_rgb(16_24_40/0.08),0_10px_24px_-6px_rgb(16_24_40/0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_5px_rgb(16_24_40/0.10),0_18px_36px_-10px_rgb(16_24_40/0.28)]">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-[0_1px_4px_rgb(16_24_40/0.10)] transition-all duration-200 group-hover:scale-105 group-hover:shadow-[0_4px_10px_-2px_rgb(16_24_40/0.16)]">
                    <Image
                      src={imageUrl(b.icon)}
                      alt=""
                      width={30}
                      height={30}
                      className="h-7 w-7 object-contain"
                    />
                  </span>

                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold leading-tight text-ink-900">
                      {b.title}
                    </span>
                    <span className="mt-1.5 block text-[12.5px] leading-snug text-ink-400">
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
