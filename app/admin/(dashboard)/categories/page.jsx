import { listCategories } from '@/lib/sql/admin-catalog';
import AdminTable from '@/components/admin/AdminTable';
import CategoryRow from '@/components/admin/CategoryRow';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Categories' };

export default async function AdminCategoriesPage() {
  const categories = await listCategories();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-semibold text-ink-900">Categories</h1>
        <span className="text-[14px] text-ink-400">{categories?.length ?? 0} categories</span>
      </div>

      <p className="mt-1.5 max-w-2xl text-[14px] text-ink-400">
        Names and search listings are editable here. Adding or removing a category still happens in the old
        panel, because that also rearranges menus and subcategories.
      </p>

      <AdminTable
        head={[
          { label: 'Category' },
          { label: 'Slug', hideSm: true },
          { label: 'Products' },
          { label: '', align: 'right' },
        ]}
        empty="No categories."
        minWidth={640}
      >
        {(categories || []).map((c) => <CategoryRow key={c.id} category={c} />)}
      </AdminTable>
    </>
  );
}
