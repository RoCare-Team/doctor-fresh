import Link from 'next/link';
import { CircleUser, Heart, Package, Pencil, ChevronRight } from 'lucide-react';
import SignOutButton from '@/components/account/SignOutButton';
import { cx } from '@/lib/utils';

/**
 * The account sidebar, matching the sections the current site's profile has.
 *
 * Every panel lives at /profile with a `tab` in the query, so each one is a
 * link a customer can bookmark or send, and the page stays server-rendered.
 */
export const ACCOUNT_TABS = [
  { id: 'profile', label: 'Profile', hint: 'Your details', icon: CircleUser },
  { id: 'orders', label: 'Order history', hint: 'Track and invoice', icon: Package },
  { id: 'wishlist', label: 'Wishlist', hint: 'Saved products', icon: Heart },
  { id: 'edit', label: 'Edit profile', hint: 'Name and address', icon: Pencil },
];

/** Two initials read better than a stock avatar when there is no photo. */
function initials(name, mobile) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return String(mobile || '').slice(-2) || 'DF';
}

export default function AccountNav({ active, profile, counts = {} }) {
  return (
    <>
      <MobileNav active={active} profile={profile} counts={counts} />
      <DesktopNav active={active} profile={profile} counts={counts} />
    </>
  );
}

/**
 * On a phone the sidebar would push the panel a screen and a half down, so the
 * sections become a scrolling strip of tabs above the content — the shape a
 * shop's account uses on mobile — and the identity shrinks to one line.
 */
function MobileNav({ active, profile, counts }) {
  return (
    <div className="min-w-0 lg:hidden">
      <div className="df-card flex items-center gap-3 p-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-500 text-[14px] font-semibold text-white">
          {initials(profile?.name, profile?.mobile)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14.5px] font-semibold text-ink-900">
            {profile?.name || 'Your account'}
          </span>
          <span className="block truncate text-[12.5px] text-ink-400">+91 {profile?.mobile}</span>
        </span>
        <SignOutButton variant="compact" />
      </div>

      {/* No negative margin here: this sits in a grid column, and bleeding
          past the container would widen the column — taking the panels below
          off the right of the screen with it. */}
      <nav
        aria-label="My profile"
        className="df-no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-0.5"
      >
        {ACCOUNT_TABS.map(({ id, label, icon: Icon }) => {
          const current = id === active;
          const count = counts[id];

          return (
            <Link
              key={id}
              href={id === 'profile' ? '/profile' : `/profile?tab=${id}`}
              aria-current={current ? 'page' : undefined}
              className={cx(
                'flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13.5px] font-medium transition-colors',
                current
                  ? 'border-primary-500 bg-primary-500 text-white'
                  : 'border-line bg-white text-ink-700',
              )}
            >
              <Icon size={15} aria-hidden="true" className={current ? 'text-white' : 'text-ink-300'} />
              {label}
              {count ? (
                <span
                  className={cx(
                    'rounded-full px-1.5 text-[11.5px] font-semibold',
                    current ? 'bg-white/25 text-white' : 'bg-surface-muted text-ink-500',
                  )}
                >
                  {count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function DesktopNav({ active, profile, counts }) {
  return (
    <div className="hidden lg:sticky lg:top-34.5 lg:block lg:self-start">
      <nav aria-label="My profile" className="df-card overflow-hidden">
        {/* Who is signed in, so the panel beside it never has to repeat it. */}
        <div className="flex items-center gap-3 border-b border-line bg-linear-to-br from-primary-50 to-surface-muted px-4 py-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-500 text-[15px] font-semibold text-white">
            {initials(profile?.name, profile?.mobile)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-semibold text-ink-900">
              {profile?.name || 'Your account'}
            </span>
            <span className="block truncate text-[13px] text-ink-400">
              +91 {profile?.mobile}
            </span>
          </span>
        </div>

        <ul>
          {ACCOUNT_TABS.map(({ id, label, hint, icon: Icon }) => {
            const current = id === active;
            const count = counts[id];

            return (
              <li key={id} className="border-b border-line last:border-0">
                <Link
                  href={id === 'profile' ? '/profile' : `/profile?tab=${id}`}
                  aria-current={current ? 'page' : undefined}
                  className={cx(
                    'group relative flex items-center gap-3 py-3 pl-4 pr-3 transition-colors',
                    current ? 'bg-primary-50/70' : 'hover:bg-surface-muted',
                  )}
                >
                  {/* The active marker is a rule on the edge, not a full fill,
                      so the sidebar stays quiet next to the panel. */}
                  {current ? (
                    <span aria-hidden="true" className="absolute inset-y-0 left-0 w-0.5 bg-primary-500" />
                  ) : null}

                  <Icon
                    size={17}
                    aria-hidden="true"
                    className={current ? 'text-primary-600' : 'text-ink-300 group-hover:text-ink-500'}
                  />

                  <span className="min-w-0 flex-1">
                    <span
                      className={cx(
                        'block text-[14.5px]',
                        current ? 'font-semibold text-primary-800' : 'font-medium text-ink-800',
                      )}
                    >
                      {label}
                    </span>
                    <span className="block text-[12.5px] text-ink-400">{hint}</span>
                  </span>

                  {count ? (
                    <span
                      className={cx(
                        'rounded-full px-2 py-0.5 text-[12px] font-semibold',
                        current ? 'bg-primary-500 text-white' : 'bg-surface-muted text-ink-500',
                      )}
                    >
                      {count}
                    </span>
                  ) : (
                    <ChevronRight
                      size={15}
                      aria-hidden="true"
                      className="text-ink-300 opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  )}
                </Link>
              </li>
            );
          })}

          <li className="border-t border-line">
            <SignOutButton />
          </li>
        </ul>
      </nav>
    </div>
  );
}
