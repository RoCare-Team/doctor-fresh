import Image from 'next/image';
import { DM_Sans, Plus_Jakarta_Sans } from 'next/font/google';
import Link from '@/components/common/NavLink'; // no prefetch until hovered
import { imageUrl } from '@/lib/utils';

// The hero's own typeface: a geometric sans, closer to the app-like menus
// visitors know than the body font.
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap' });
// The headline alone gets a display face, so it reads as the page's title.
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['600', '800'], display: 'swap' });
// The words animate one at a time, so each line arrives here as words.
const asWords = (phrase) => String(phrase || '').trim().split(/s+/).filter(Boolean);

/**
 * The first screen: what we sell on the left, what that looks like on the
 * right.
 *
 * The left side is a plain menu of nine product tiles in a bordered card —
 * only things a household buys — so the range is readable at a glance and
 * every tile is a link. The right side is three photos and nothing else: the
 * purifier and the ionizer on a kitchen counter, and the sweeper on its floor.
 */

/*
 * The pictures came in under their WhatsApp names — spaces, dots and brackets
 * — so each is kept beside the original under a plain name, which is what the
 * page asks for.
 */
// Only used until somebody saves their own four in the admin.
const DEFAULT_PHOTOS = [
  { src: '/images/hero-kitchen-purifier-woman.jpg', alt: 'Filling a glass from a wall-mounted Doctor Fresh purifier' },
  { src: '/images/hero-ionizer-woman.jpg', alt: 'Drinking a glass of water beside a Doctor Fresh alkaline ioniser' },
  { src: '/images/hero-tap-purifier-veggies.jpg', alt: 'Washing vegetables under a Doctor Fresh tap purifier' },
  { src: '/images/hero-undersink-veggies.jpg', alt: 'Washing vegetables at a sink fed by a Doctor Fresh filter' },
];

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

/**
 * One photo of the right-hand grid. Only a picture — not a link.
 *
 * A room photograph fills its box; a product shot on a white background is
 * shown whole instead, with room around it, because cropping into one cuts the
 * product in half.
 */
function Photo({ photo, sizes, priority = false }) {
  if (!photo?.src) return null;

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

/**
 * Everything on this screen is editable in the admin (Site content → Hero):
 * the heading, the lines that take turns after it, the nine tiles and the four
 * photographs. What is passed in wins; the built-in copy only fills a gap.
 */
export default function Hero({ tiles = [], hero = {} }) {
  const headingLead = hero.headingLead || 'Pure water,';
  const phrases = (hero.phrases?.length ? hero.phrases : [
    'right at your doorstep',
    'for every Indian home',
    'tested by water experts',
    'serviced within 24 hours',
  ]).map(asWords);

  // Four frames: two tall, two short, arranged so the seams do not line up.
  const photos = (hero.photos?.length ? hero.photos : DEFAULT_PHOTOS).slice(0, 4);
  const [first, second, third, fourth] = [0, 1, 2, 3].map((i) => photos[i] || photos[photos.length - 1]);

  return (
    <section className={`bg-white ${dmSans.className}`}>
      <div className="df-container pb-6 pt-6 md:pt-8">
        {/* Menu and photos side by side. The heading belongs to the left
            column rather than to the row above it, so the photographs start at
            the top of the section instead of below an empty strip. */}
        <div className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-start lg:gap-8">
          <div className="flex min-w-0 flex-col">
            <div className={jakarta.className}>
            <h1 className="text-[24px] font-extrabold leading-[1.25] tracking-[-0.03em] text-ink-900 sm:text-[28px] lg:text-[32px]">
              {headingLead}{' '}
              {/* read out once, as the first line; the moving lines are decoration */}
              <span className="sr-only">{phrases[0].join(' ')}</span>
              <span aria-hidden="true" className="df-phrases whitespace-nowrap">
                {phrases.map((words, p) => (
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

            {/* ------------------------------------------------------ what we do */}
            <div className="mt-5 w-full rounded-2xl border border-[#e6eaee] bg-white p-4 shadow-[0_12px_32px_-24px_rgb(6_59_76/0.35)] md:mt-6 sm:px-5 sm:py-5">
              <ul className="grid h-full grid-cols-3 content-center gap-x-2 gap-y-4">
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
          </div>

          {/* ---------------------------------------------------------- photos */}
          {/* Two columns, each a tall frame and a short one in opposite order
              — one big and one small on both sides, as the reference has it. */}
          <div className="hidden min-h-150 grid-cols-2 gap-2.5 lg:grid">
            <div className="grid grid-rows-[1.3fr_1fr] gap-2.5">
              <Photo photo={first} sizes="(min-width: 1300px) 410px, (min-width: 1024px) 30vw, 0px" priority />
              <Photo photo={third} sizes="(min-width: 1300px) 410px, (min-width: 1024px) 30vw, 0px" priority />
            </div>
            <div className="grid grid-rows-[1fr_1.3fr] gap-2.5">
              <Photo photo={second} sizes="(min-width: 1300px) 410px, (min-width: 1024px) 30vw, 0px" priority />
              <Photo photo={fourth} sizes="(min-width: 1300px) 410px, (min-width: 1024px) 30vw, 0px" priority />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
