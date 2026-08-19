import Image from 'next/image';
import { imageUrl } from '@/lib/utils';

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
    <section className="border-b border-line bg-white">
      <div className="df-container">
        <ul className="df-no-scrollbar -mx-4 flex divide-x divide-line overflow-x-auto px-4 py-6 md:mx-0 md:grid md:grid-cols-3 md:px-0 lg:grid-cols-6">
          {badges.map((b) => (
            <li
              key={b.title}
              className="flex min-w-[210px] items-start gap-3 px-4 first:pl-0 last:pr-0 md:min-w-0 md:px-5"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50">
                <Image
                  src={imageUrl(b.icon)}
                  alt=""
                  width={26}
                  height={26}
                  className="h-6 w-6 object-contain"
                  unoptimized
                />
              </span>
              <span className="min-w-0">
                <span className="block text-[14.5px] font-semibold leading-tight text-ink-900">
                  {b.title}
                </span>
                <span className="mt-1 block text-[13px] leading-snug text-ink-400">
                  {SUPPORT[b.title] || ''}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
