/**
 * Animated water behind the water-test band: drops fall, land with a ripple,
 * and the waves along the bottom drift slowly.
 *
 * Plain markup and CSS keyframes (df-drop-* in globals.css) — no JavaScript,
 * so it costs nothing to hydrate. Each drop and its ripple share a duration
 * and a delay, so the ripple opens at the moment the drop lands. The global
 * prefers-reduced-motion rule stops it all for anyone who asks.
 */

// left / top of the landing point in %, how far the drop falls (px), timing (s)
const DROPS = [
  { x: 8, y: 70, fall: 120, dur: 5.2, delay: 0, size: 19 },
  { x: 22, y: 82, fall: 150, dur: 6.4, delay: 2.1, size: 15 },
  { x: 37, y: 64, fall: 110, dur: 5.8, delay: 3.6, size: 17 },
  { x: 51, y: 86, fall: 160, dur: 7.0, delay: 1.2, size: 14 },
  { x: 66, y: 74, fall: 130, dur: 6.0, delay: 4.4, size: 18 },
  { x: 80, y: 60, fall: 100, dur: 5.5, delay: 2.8, size: 15 },
  { x: 93, y: 80, fall: 140, dur: 6.8, delay: 0.7, size: 17 },
];

const DROP_PATH = 'M12 2C12 2 5 10.2 5 15a7 7 0 0 0 14 0C19 10.2 12 2 12 2Z';

export default function WaterDrops({ className = '' }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {/* depth: a light pool top-left, a cooler one bottom-right */}
      <div className="absolute -left-32 -top-40 h-[440px] w-[440px] rounded-full bg-primary-400/25 blur-3xl" />
      <div className="absolute -bottom-48 right-[-6rem] h-[420px] w-[420px] rounded-full bg-accent-400/15 blur-3xl" />

      {/* caustic shimmer: a fine dot grid that fades into the middle */}
      <div className="absolute inset-0 opacity-[0.14] [background-image:radial-gradient(var(--color-primary-200)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_top_left,black_0%,transparent_70%)]" />

      {/* falling drops, each with the ripple it makes on landing */}
      {DROPS.map((d) => {
        const timing = { animationDuration: `${d.dur}s`, animationDelay: `${d.delay}s` };
        return (
          <span key={d.x} className="absolute" style={{ left: `${d.x}%`, top: `${d.y}%` }}>
            <svg
              viewBox="0 0 24 24"
              width={d.size}
              height={d.size * 1.2}
              className="df-drop-fall absolute -translate-x-1/2 -translate-y-full text-primary-200/80 drop-shadow-[0_0_6px_rgb(125_211_252/0.5)]"
              style={{ ...timing, '--fall': `${d.fall}px` }}
            >
              <path d={DROP_PATH} fill="currentColor" />
            </svg>
            <span
              className="df-drop-ripple absolute h-12 w-20 -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-primary-200/70"
              style={timing}
            />
            <span
              className="df-drop-ripple absolute h-12 w-20 -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-primary-200/45"
              style={{ ...timing, animationDelay: `${d.delay + 0.35}s` }}
            />
          </span>
        );
      })}

      {/* waves along the bottom, twice as wide as the band and repeating every
          half, so drifting by half a width loops without a seam */}
      <div className="absolute inset-x-0 bottom-0 h-24 overflow-hidden md:h-32">
        <svg className="df-wave-drift absolute bottom-0 left-0 h-full w-[200%]" viewBox="0 0 2880 200" preserveAspectRatio="none">
          <path
            d="M0 110Q360 50 720 110T1440 110T2160 110T2880 110V200H0Z"
            className="fill-primary-400/15"
          />
        </svg>
        <svg
          className="df-wave-drift absolute bottom-0 left-0 h-[80%] w-[200%] [animation-direction:reverse] [animation-duration:26s]"
          viewBox="0 0 2880 200"
          preserveAspectRatio="none"
        >
          <path
            d="M0 140Q180 105 360 140T720 140T1080 140T1440 140T1800 140T2160 140T2520 140T2880 140V200H0Z"
            className="fill-white/[0.06]"
          />
        </svg>
      </div>
    </div>
  );
}
