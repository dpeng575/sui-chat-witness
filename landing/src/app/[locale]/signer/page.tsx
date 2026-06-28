import { notFound } from 'next/navigation';

import { SignerClientLoader } from '@/components/signer-client-loader';
import { WalletProviders } from '@/components/wallet-providers';
import { isLocale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function SignerPage({
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
      <SignerClientLoader />
    </WalletProviders>
  );
}
