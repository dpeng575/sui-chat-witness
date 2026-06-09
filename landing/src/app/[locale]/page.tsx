import { notFound } from 'next/navigation';

import { getDictionary, isLocale } from '@/lib/i18n';

export default async function LocalePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const dictionary = getDictionary(locale);

  return (
    <main>
      <h1>{dictionary.landing.heroTitle}</h1>
      <p>{dictionary.landing.heroSubtitle}</p>
    </main>
  );
}
