import Link from 'next/link';
import { cx } from '@/lib/utils';

const VARIANTS = {
  primary:
    'bg-primary-500 text-white hover:bg-ink-900 border border-transparent',
  accent:
    'bg-accent-600 text-white hover:bg-accent-700 border border-transparent',
  outline:
    'bg-white text-primary-600 border border-primary-500 hover:bg-primary-50 hover:text-primary-700',
  soft:
    'bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100',
  ghost:
    'bg-transparent text-ink-500 border border-transparent hover:text-primary-600 hover:bg-primary-50',
  dark:
    'bg-ink-900 text-white hover:bg-primary-500 border border-transparent',
};

const SIZES = {
  sm: 'h-9 px-3.5 text-[14px]',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-[16px]',
};

export default function Button({
  as,
  href,
  variant = 'primary',
  size = 'md',
  className,
  children,
  full,
  ...rest
}) {
  const classes = cx(
    'inline-flex items-center justify-center gap-2 rounded-md font-medium',
    'transition-all duration-150 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed',
    VARIANTS[variant] || VARIANTS.primary,
    SIZES[size] || SIZES.md,
    full && 'w-full',
    className,
  );

  if (href) {
    const external = /^(https?:|tel:|mailto:)/.test(href);
    if (external) {
      return (
        <a href={href} className={classes} {...rest}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  const Tag = as || 'button';
  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  );
}
