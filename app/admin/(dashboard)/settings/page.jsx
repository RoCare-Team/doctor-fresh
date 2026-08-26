import { getSettingsForAdmin, EDITABLE_SETTINGS } from '@/lib/sql/admin-catalog';
import SettingsForm from '@/components/admin/SettingsForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Settings' };

export default async function AdminSettingsPage() {
  const values = await getSettingsForAdmin();

  return (
    <>
      <h1 className="text-[22px] font-semibold text-ink-900">Settings</h1>
      <p className="mt-1.5 max-w-2xl text-[14px] text-ink-400">
        These are the `general_settings` rows the site reads for its name, contact details and footer. Changing
        one here changes it on the site within five minutes.
      </p>

      <div className="mt-5 max-w-2xl">
        <SettingsForm fields={EDITABLE_SETTINGS} values={values || {}} />
      </div>
    </>
  );
}
