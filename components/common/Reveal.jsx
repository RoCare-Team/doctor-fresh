/**
 * Scroll reveal: fades and lifts its children into place the first time they
 * enter the viewport.
 *
 * Only a class — no JavaScript of its own, so a page full of these costs
 * nothing to hydrate. One watcher for the whole page (ClientEffects) hides
 * what starts below the fold and reveals it on the way down; the motion is a
 * plain CSS transition, and the global prefers-reduced-motion rule turns it
 * off for anyone who asks.
 */
export default function Reveal({
  as: Tag = 'div', delay = 0, className = '', children, ...rest
}) {
  return (
    <Tag
      className={`df-reveal ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}
