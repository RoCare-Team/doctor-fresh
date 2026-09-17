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
          <span className="block truncate text-[14.5px] font-semibold capitalize text-ink-900">
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
        <div className="relative overflow-hidden bg-linear-to-br from-primary-500 to-primary-700 px-4 pb-4 pt-5 text-white">
          <span aria-hidden="true" className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/10" />
          <span aria-hidden="true" className="absolute -bottom-12 right-10 h-20 w-20 rounded-full bg-white/5" />

          <div className="relative flex items-center gap-3">
            <span className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full bg-white text-[17px] font-bold text-primary-700 shadow-[0_6px_16px_-8px_rgb(0_0_0/0.45)]">
              {initials(profile?.name, profile?.mobile)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[16px] font-semibold capitalize">
                {profile?.name || 'Your account'}
              </span>
              <span className="block truncate text-[13px] text-white/80">
                +91 {profile?.mobile}
              </span>
            </span>
          </div>
        </div>

        {/* Each section is its own rounded row with air around it, so the
            list reads as separate choices rather than one ruled block. */}
        <ul className="space-y-1 p-2">
          {ACCOUNT_TABS.map(({ id, label, hint, icon: Icon }) => {
            const current = id === active;
            const count = counts[id];

            return (
              <li key={id}>
                <Link
                  href={id === 'profile' ? '/profile' : `/profile?tab=${id}`}
                  aria-current={current ? 'page' : undefined}
                  className={cx(
                    'group flex items-center gap-3 rounded-xl border px-2.5 py-2.5 transition-all',
                    current
                      ? 'border-primary-200 bg-primary-50 shadow-[0_4px_14px_-10px_rgb(21_151_197/0.8)]'
                      : 'border-transparent hover:border-line hover:bg-surface-muted',
                  )}
                >
                  <span
                    className={cx(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
                      current
                        ? 'bg-primary-500 text-white'
                        : 'bg-surface-muted text-ink-500 group-hover:bg-white group-hover:text-primary-600',
                    )}
                  >
                    <Icon size={17} aria-hidden="true" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className={cx(
                        'block text-[14.5px] leading-tight',
                        current ? 'font-semibold text-primary-800' : 'font-medium text-ink-800',
                      )}
                    >
                      {label}
                    </span>
                    <span className="mt-0.5 block text-[12.5px] text-ink-400">{hint}</span>
                  </span>

                  {count ? (
                    <span
                      className={cx(
                        'min-w-6 rounded-full px-1.5 py-0.5 text-center text-[12px] font-semibold',
                        current ? 'bg-primary-500 text-white' : 'bg-white text-ink-500 ring-1 ring-line',
                      )}
                    >
                      {count}
                    </span>
                  ) : (
                    <ChevronRight
                      size={16}
                      aria-hidden="true"
                      className={cx(
                        'transition-all',
                        current ? 'text-primary-500' : 'text-ink-300 group-hover:translate-x-0.5',
                      )}
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Leaving the account is a different kind of action from moving
            between its sections, so it sits apart and in its own colour. */}
        <div className="border-t border-line p-2">
          <SignOutButton />
        </div>
      </nav>
    </div>
  );
}
