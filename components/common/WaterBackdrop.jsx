/**
 * Decorative water artwork used behind the hero and the water-test section.
 *
 * Inline SVG in the brand blues — waves, ripple rings and bubbles. It carries
 * no file weight, scales to any width and never competes with the copy on top.
 * Purely presentational, so it is hidden from assistive tech.
 */
export default function WaterBackdrop({ variant = 'hero', tone = 'dark', className = '' }) {
  const isHero = variant === 'hero';
  const dark = tone === 'dark';

  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {/* soft colour washes */}
      <div
        className={`absolute -left-40 -top-48 h-[520px] w-[520px] rounded-full blur-3xl ${
          dark ? 'bg-primary-500/25' : 'bg-primary-200/45'
        }`}
      />
      <div
        className={`absolute -bottom-56 right-[-8rem] h-[480px] w-[480px] rounded-full blur-3xl ${
          dark ? 'bg-accent-500/12' : 'bg-accent-100/70'
        }`}
      />

      {/* fine dot grid, fading out towards the middle */}
      <div
        className={`absolute inset-0 [background-image:radial-gradient(var(--color-primary-300)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_top_left,black_0%,transparent_66%)] ${
          dark ? 'opacity-[0.16]' : 'opacity-40'
        }`}
      />

      {/* ripple rings */}
      <svg
        className={`absolute right-[6%] top-[12%] h-52 w-52 md:h-72 md:w-72 ${dark ? 'text-primary-300/25' : 'text-primary-300/45'}`}
        viewBox="0 0 200 200"
        fill="none"
      >
        <circle cx="100" cy="100" r="34" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="56" stroke="currentColor" strokeWidth="1.25" opacity="0.75" />
        <circle cx="100" cy="100" r="78" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <circle cx="100" cy="100" r="99" stroke="currentColor" strokeWidth="0.75" opacity="0.3" />
      </svg>

      {/* bubbles */}
      <svg
        className={`absolute ${isHero ? 'left-[38%] top-[18%]' : 'left-[30%] top-[10%]'} h-40 w-40 ${dark ? 'text-primary-300/30' : 'text-primary-400/35'}`}
        viewBox="0 0 160 160"
        fill="none"
      >
        <circle cx="26" cy="120" r="7" stroke="currentColor" strokeWidth="1.25" />
        <circle cx="58" cy="86" r="4.5" stroke="currentColor" strokeWidth="1.25" />
        <circle cx="96" cy="118" r="10" stroke="currentColor" strokeWidth="1.25" />
        <circle cx="124" cy="70" r="5.5" stroke="currentColor" strokeWidth="1.25" />
        <circle cx="76" cy="40" r="3.5" stroke="currentColor" strokeWidth="1.25" />
        <circle cx="140" cy="122" r="3" stroke="currentColor" strokeWidth="1.25" />
      </svg>

      {/* layered waves along the bottom edge */}
      <svg
        className="absolute inset-x-0 bottom-0 h-32 w-full md:h-44"
        viewBox="0 0 1440 200"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M0 96C160 40 320 40 480 84s320 76 480 40 320-76 480-52v128H0V96Z"
          className={dark ? 'fill-primary-500/20' : 'fill-primary-200/50'}
        />
        <path
          d="M0 128C180 82 360 92 540 124s360 60 540 24 240-44 360-28v80H0v-72Z"
          className={dark ? 'fill-primary-400/15' : 'fill-primary-300/35'}
        />
        <path
          d="M0 168c200-40 400-24 600 8s400 44 600 8 180-28 240-20v36H0v-32Z"
          className={dark ? 'fill-white/[0.06]' : 'fill-white/70'}
        />
      </svg>
    </div>
  );
}
