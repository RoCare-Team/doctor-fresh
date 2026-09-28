import { MessageCircle, Phone } from 'lucide-react';

/**
 * The WhatsApp and call buttons that sit in the corner of every shop page.
 *
 * Both are ordinary links — the `wa.me` address the site settings already
 * build, and `tel:` — so nothing is signed up for, no script is loaded and
 * nothing can stop working. The number is the one the header and footer show.
 *
 * Most of our visitors are on a phone looking for a technician today. Making
 * them scroll to the footer for a number is the cheapest sale a shop can lose.
 */

export default function ContactDock({ brand }) {
  const phone = brand?.phoneRaw || brand?.phone || '';
  const wa = brand?.whatsapp || '';
  if (!phone && !wa) return null;

  const message = encodeURIComponent('Hi, I need help choosing a water purifier / booking a service.');

  return (
    <div
      // Above the product page's own buy bar on a phone, out of its way on a
      // laptop. Below the header's z-50 so a menu still opens over it.
      className="fixed bottom-20 right-3 z-40 flex flex-col gap-2.5 sm:bottom-6 sm:right-5 lg:bottom-7"
    >
      {wa ? (
        <a
          href={`${wa}?text=${message}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with us on WhatsApp"
          className="group flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_24px_-8px_rgb(37_211_102/0.7)] transition-transform duration-200 hover:scale-105 sm:h-[52px] sm:w-[52px]"
        >
          <MessageCircle size={24} strokeWidth={2.2} aria-hidden="true" />
        </a>
      ) : null}

      {phone ? (
        <a
          href={`tel:${phone}`}
          aria-label={`Call us on ${brand?.phone || phone}`}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-white shadow-[0_8px_24px_-8px_rgb(6_59_76/0.6)] transition-transform duration-200 hover:scale-105 sm:h-[52px] sm:w-[52px]"
        >
          <Phone size={21} strokeWidth={2.2} aria-hidden="true" />
        </a>
      ) : null}
    </div>
  );
}
