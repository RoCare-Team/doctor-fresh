import { Check } from 'lucide-react';
import Button from '@/components/common/Button';
import { formatPrice } from '@/lib/utils';

/**
 * Renders the real service packages (RO Routine Service, Repair, Installation,
 * AMC …) grouped exactly as they appear on the live service pages.
 */
export default function ServicePackages({ packages = [] }) {
  if (!packages.length) return null;

  const groups = [];
  for (const pkg of packages) {
    let group = groups.find((g) => g.id === pkg.group);
    if (!group) {
      group = { id: pkg.group, title: pkg.groupTitle, items: [] };
      groups.push(group);
    }
    group.items.push(pkg);
  }

  return (
    <div className="space-y-10">
      {groups.map((group) => (
        <section key={group.id || group.title} id={group.id || undefined} className="scroll-mt-[156px]">
          <h2 className="mb-4 text-xl font-semibold text-ink-900">{group.title}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {group.items.map((pkg) => (
              <article
                key={`${group.id}-${pkg.title}`}
                className="flex flex-col df-card p-5"
              >
                <h3 className="text-[16px] font-medium text-ink-900">{pkg.title}</h3>

                {pkg.price ? (
                  <p className="mt-2 flex items-baseline gap-2">
                    <span className="text-xl font-semibold text-ink-900">{formatPrice(pkg.price)}</span>
                    {pkg.mrp && pkg.mrp > pkg.price ? (
                      <span className="text-[14px] text-ink-300 line-through">{formatPrice(pkg.mrp)}</span>
                    ) : null}
                  </p>
                ) : null}

                {pkg.bullets?.length ? (
                  <ul className="mt-3 flex-1 space-y-1.5">
                    {pkg.bullets.map((b, i) => (
                      <li key={i} className="flex items-start gap-2 text-[14px] leading-relaxed text-ink-500">
                        <Check size={14} className="mt-1 shrink-0 text-success" aria-hidden="true" />
                        {b}
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="mt-4 flex gap-2">
                  <Button href="tel:9311587716" size="sm" className="flex-1">
                    Book now
                  </Button>
                  <Button href="#book" variant="outline" size="sm" className="flex-1">
                    Request callback
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
