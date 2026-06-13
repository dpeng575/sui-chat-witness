import { notFound } from 'next/navigation';

import { WalletProviders } from '@/components/wallet-providers';
import { DashboardClient } from '@/components/dashboard-client';
import { getDictionary, isLocale } from '@/lib/i18n';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  return (
    <WalletProviders>
      <DashboardClient locale={locale} dictionary={getDictionary(locale)} />
    </WalletProviders>
  );
}
