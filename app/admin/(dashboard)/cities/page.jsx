import { requirePage } from '@/lib/admin/guard';
import { listCities, listStates } from '@/lib/sql/geo';
import CitiesManager from '@/components/admin/CitiesManager';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'States & Cities' };

export default async function AdminCitiesPage() {
  await requirePage('cities');
  const [cities, states] = await Promise.all([listCities(), listStates()]);
  return <CitiesManager cities={cities || []} states={states || []} />;
}
