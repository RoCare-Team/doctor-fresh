import Image from 'next/image';
import { DM_Sans, Plus_Jakarta_Sans } from 'next/font/google';
import Link from '@/components/common/NavLink'; // no prefetch until hovered
import { imageUrl } from '@/lib/utils';

// The hero's own typeface: a geometric sans, closer to the app-like menus
// visitors know than the body font.
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap' });
// The headline alone gets a display face, so it reads as the page's title.
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['600', '800'], display: 'swap' });
// The lines that take turns after "Pure water,"; the first is the one read out.
const PHRASES = [
  ['right', 'at', 'your', 'doorstep'],
  ['for', 'every', 'Indian', 'home'],
  ['tested', 'by', 'water', 'experts'],
  ['serviced', 'within', '24', 'hours'],
];

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
      <div className="df-container pb-6 pt-3 md:pt-4">
        {/* menu and photos side by side, edge to edge on the page line */}
        <div>
          <div className={jakarta.className}>
            <h1 className="text-[24px] font-extrabold leading-[1.15] tracking-[-0.03em] text-ink-900 sm:text-[28px] lg:text-[32px]">
              Pure water,{' '}
              {/* read out once, as the first line; the moving lines are decoration */}
              <span className="sr-only">{PHRASES[0].join(' ')}</span>
              <span aria-hidden="true" className="df-phrases whitespace-nowrap">
                {PHRASES.map((words, p) => (
                  <span key={words.join(' ')} className="df-phrase">
                    {/* one word at a time, each sliding up after the last */}
                    {words.map((word, i) => (
                      <span key={word}>
                        <span
                          className="df-word-in bg-linear-to-r from-primary-500 to-primary-800 bg-clip-text text-transparent"
                          style={{ animationDelay: `${p * 3500 + 150 + i * 140}ms` }}
                        >
                          {word}
                        </span>
                        {i < words.length - 1 ? ' ' : null}
                      </span>
                    ))}
                    {/* a soft brush stroke under the line, drawn once its words are in */}
                    <span
                      className="df-stroke-in absolute inset-x-0 -bottom-0.5 -z-10 h-2.5 rounded-full bg-primary-100"
                      style={{ animationDelay: `${p * 3500 + 150 + words.length * 140}ms` }}
                    />
                  </span>
                ))}
              </span>
            </h1>
          </div>

          <div className="mt-3 grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-stretch lg:gap-8">
            {/* ------------------------------------------------------ what we do */}
            <div className="w-full rounded-2xl border border-[#e6eaee] bg-white p-4 shadow-[0_12px_32px_-24px_rgb(6_59_76/0.35)] sm:px-5 sm:py-5">
              <ul className="grid h-full grid-cols-3 content-center gap-x-1 gap-y-4 lg:grid-cols-[repeat(3,122px)]">
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
            {/* two small photos over one large one, filling the rest of the row */}
            <div className="hidden min-h-[400px] grid-rows-[minmax(0,2fr)_minmax(0,3fr)] gap-4 lg:grid">
              <div className="grid grid-cols-2 gap-4">
                <Photo photo={PHOTOS.home} sizes="(min-width: 1300px) 410px, (min-width: 1024px) 30vw, 0px" priority />
                <Photo photo={PHOTOS.ionizer} sizes="(min-width: 1300px) 410px, (min-width: 1024px) 30vw, 0px" priority />
              </div>
              <Photo photo={PHOTOS.sweeper} sizes="(min-width: 1300px) 830px, (min-width: 1024px) 60vw, 0px" priority />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
