import Image from 'next/image';
import { DM_Sans } from 'next/font/google';
import Link from '@/components/common/NavLink'; // no prefetch until hovered
import { imageUrl } from '@/lib/utils';

// The hero's own typeface: a geometric sans, closer to the app-like menus
// visitors know than the body font.
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap' });

/**
 * The first screen: what we sell on the left, what that looks like on the
 * right.
 *
 * The left side is a plain menu of nine product tiles in a bordered card —
 * only things a household buys — so the range is readable at a glance and
 * every tile is a link. The right side is three photos and nothing else: the
 * purifier and the ionizer on a kitchen counter, and the sweeper on its floor.
 */

const PHOTOS = {
  home: { src: '/images/hero-kitchen-purifier-2.webp', alt: 'Doctor Fresh water purifier on a kitchen counter' },
  ionizer: { src: '/images/hero-kitchen-ionizer.webp', alt: 'Doctor Fresh water ionizer on a kitchen counter' },
  sweeper: { src: '/images/hero-floor-sweeper.webp', alt: 'Doctor Fresh floor sweeper on a kitchen floor', position: 'object-[center_75%]' },
};

/** "Geyser for Home" → the name, with "for Home" as a quiet second line. */
function splitLabel(label) {
  const m = label.match(/^(.*?)\s+(for Home)$/i);
  return m ? [m[1], m[2]] : [label, null];
}

function Tile({ href, label, children }) {
  const [name, tag] = splitLabel(label);
  return (
    <li>
      <Link href={href} className="group block text-center">
        <span className="relative mx-auto flex aspect-square w-full max-w-[76px] items-center justify-center overflow-hidden rounded-xl bg-[#f5f5f5] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:bg-[#eef4f7]">
          {children}
        </span>
        <span className="mt-2 block text-[12.5px] font-semibold leading-tight tracking-[-0.01em] text-ink-900 sm:text-[13px]">
          {name}
        </span>
        {tag ? (
          <span className="mt-0.5 block text-[11px] font-medium text-[#7a8790]">{tag}</span>
        ) : null}
      </Link>
    </li>
  );
}

/** One photo of the right-hand grid. Only a picture — not a link. */
function Photo({ photo, sizes, priority = false }) {
  return (
    <div className="relative h-full overflow-hidden rounded-2xl bg-[#eef4f7]">
      <Image
        src={photo.src}
        alt={photo.alt}
        fill
        priority={priority}
        sizes={sizes}
        className={`object-cover ${photo.position || ''}`}
      />
    </div>
  );
}

export default function Hero({ tiles = [] }) {
  return (
    <section className={`bg-white ${dmSans.className}`}>
      <div className="df-container py-6 lg:px-12 xl:px-16">
        {/* menu and photos sit side by side, centred as one block */}
        <div className="xl:mx-auto xl:w-fit">
          <h1 className="text-[22px] font-bold leading-tight tracking-[-0.02em] text-ink-900 sm:text-[24px] lg:text-[26px]">
            Pure water solutions at your doorstep
          </h1>

          <div className="mt-4 grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-stretch lg:gap-8 xl:grid-cols-[auto_596px]">
            {/* ------------------------------------------------------ what we do */}
            <div className="w-full rounded-2xl border border-[#e6eaee] bg-white p-4 shadow-[0_12px_32px_-24px_rgb(6_59_76/0.35)] sm:w-fit sm:px-5 sm:py-5 lg:w-full">
              <ul className="grid h-full grid-cols-3 content-center gap-x-1 gap-y-4 sm:grid-cols-[repeat(3,122px)]">
                {tiles.map((tile) => (
                  <Tile key={tile.label} href={tile.href} label={tile.label}>
                    {tile.image ? (
                      <Image
                        src={imageUrl(tile.image)}
                        alt=""
                        fill
                        sizes="76px"
                        className="object-contain p-1.5 mix-blend-multiply transition-transform duration-200 group-hover:scale-105"
                      />
                    ) : null}
                  </Tile>
                ))}
              </ul>
            </div>

            {/* ---------------------------------------------------------- photos */}
            {/* two small photos over one large one, never wider than 596px */}
            <div className="hidden min-h-[400px] grid-rows-[minmax(0,2fr)_minmax(0,3fr)] gap-4 lg:grid">
              <div className="grid grid-cols-2 gap-4">
                <Photo photo={PHOTOS.home} sizes="(min-width: 1024px) 290px, 0px" priority />
                <Photo photo={PHOTOS.ionizer} sizes="(min-width: 1024px) 290px, 0px" priority />
              </div>
              <Photo photo={PHOTOS.sweeper} sizes="(min-width: 1024px) 596px, 0px" priority />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
