import { notFound } from 'next/navigation';

import { LandingPage } from '@/components/landing-page';
import { getDictionary, isLocale } from '@/lib/i18n';

export default async function LocaleHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  return <LandingPage locale={locale} dictionary={getDictionary(locale)} />;
}
