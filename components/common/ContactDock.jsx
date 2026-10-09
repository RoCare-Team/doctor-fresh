import { Phone } from 'lucide-react';

// The official WhatsApp glyph (speech bubble with handset), so the button is
// recognised at a glance — a generic chat bubble is not.
function WhatsAppIcon({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

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
          <WhatsAppIcon size={26} />
        </a>
      ) : null}

      {phone ? (
        <a
          href={`tel:${phone}`}
          aria-label={`Call us on ${brand?.phone || phone}`}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-white shadow-[0_6px_16px_-6px_rgb(15_23_42/0.3)] transition-transform duration-200 hover:scale-105 sm:h-[52px] sm:w-[52px]"
        >
          <Phone size={21} strokeWidth={2.2} aria-hidden="true" />
        </a>
      ) : null}
    </div>
  );
}
