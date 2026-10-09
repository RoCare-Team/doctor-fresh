import Image from 'next/image';
import { imageUrl } from '@/lib/utils';
import Reveal from '@/components/common/Reveal';

/**
 * The brands we sell and service, as a row of logos.
 *
 * Nothing is built in: the list is whatever has been uploaded under Site
 * content → Home sections, and the strip is simply absent until then. A logo
 * belongs to the company that owns it, so which ones may be shown is a
 * decision for the business, not a default in the code.
 */
export default function BrandStrip({ brands = [], title = 'Brands we sell & service' }) {
  const items = brands.filter((b) => b?.icon);
  if (!items.length) return null;

  return (
    <section className="border-y border-line">
      <div className="df-container py-9 md:py-11">
        <Reveal>
          <h2 className="text-center text-[13px] font-semibold uppercase tracking-[0.14em] text-ink-400">
            {title}
          </h2>
        </Reveal>

        {/* A row on a laptop; on a phone it scrolls sideways rather than
            shrinking every logo to nothing. */}
        <ul className="df-no-scrollbar mt-6 flex items-center gap-3 overflow-x-auto sm:flex-wrap sm:justify-center sm:gap-4 sm:overflow-visible">
          {items.map((b, i) => (
            <Reveal as="li" key={`${b.icon}-${b.title}`} delay={(i % 8) * 50} className="shrink-0">
              <span className="flex h-[70px] w-[130px] items-center justify-center rounded-xl border border-line bg-white px-4 transition-shadow duration-200 hover:shadow-[0_8px_20px_-14px_rgb(15_23_42/0.2)]">
                <Image
                  src={imageUrl(b.icon)}
                  alt={b.title || ''}
                  width={110}
                  height={44}
                  // Logos come in every shape; the box is fixed and the logo
                  // fits inside it rather than the row going ragged.
                  className="max-h-11 w-auto object-contain opacity-80 transition-opacity duration-200 hover:opacity-100"
                />
              </span>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
