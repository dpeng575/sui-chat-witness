import Link from 'next/link';

import type { Dictionary, Locale } from '@/lib/i18n';
import { switchLocalePath } from '@/lib/i18n';
import { publicConfig } from '@/lib/config';

const platforms = ['ChatGPT', 'Claude', 'Gemini', 'Kimi'];

export function LandingPage({
  locale,
  dictionary,
}: {
  locale: Locale;
  dictionary: Dictionary;
}) {
  const otherLocale: Locale = locale === 'zh' ? 'en' : 'zh';
  const dashboardHref = `/${locale}/dashboard`;

  return (
    <main className="min-h-screen overflow-hidden bg-[#fff7fb] text-[#17111a]">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-[-10rem] top-[-8rem] h-96 w-96 rounded-full bg-[#ff8fca]/30 blur-3xl" />
        <div className="absolute right-[-8rem] top-28 h-[30rem] w-[30rem] rounded-full bg-[#7c3aed]/10 blur-3xl" />
        <div className="absolute bottom-[-12rem] left-1/3 h-[28rem] w-[28rem] rounded-full bg-[#f7c948]/20 blur-3xl" />
      </div>

      <header className="sticky top-0 z-20 border-b border-[#2a182f]/10 bg-[#fff7fb]/85 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8" aria-label="Primary navigation">
          <Link href={`/${locale}`} className="group flex items-center gap-3" aria-label="Sui-Seal home">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#17111a] text-sm font-black tracking-tight text-white shadow-[0_12px_30px_rgba(23,17,26,0.18)] transition-transform group-hover:-rotate-6">
              SS
            </span>
            <span>
              <span className="block text-sm font-black uppercase tracking-[0.24em] text-[#17111a]">Sui-Seal</span>
              <span className="block text-xs font-semibold text-[#7c556d]">Chat Witness</span>
            </span>
          </Link>

          <div className="hidden items-center gap-8 text-sm font-bold text-[#5f4659] md:flex">
            <a className="transition hover:text-brand" href="#product">
              {dictionary.nav.product}
            </a>
            <a className="transition hover:text-brand" href="#install">
              {dictionary.nav.install}
            </a>
            <a className="transition hover:text-brand" href="#faq">
              {dictionary.nav.faq}
            </a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              className="rounded-full border border-[#2a182f]/15 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#4c3447] transition hover:border-brand/50 hover:text-brand"
              href={switchLocalePath(`/${locale}`, otherLocale)}
            >
              {otherLocale.toUpperCase()}
            </Link>
            <Link
              className="hidden rounded-full bg-white px-4 py-2 text-sm font-extrabold text-[#17111a] shadow-[0_12px_30px_rgba(23,17,26,0.08)] ring-1 ring-[#2a182f]/10 transition hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(23,17,26,0.12)] sm:inline-flex"
              href={dashboardHref}
            >
              {dictionary.nav.dashboard}
            </Link>
          </div>
        </nav>
      </header>

      <section className="relative mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:py-28">
        <div>
          <p className="mb-6 inline-flex rounded-full border border-brand/25 bg-white/75 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-brand shadow-soft">
            {dictionary.landing.badge}
          </p>
          <h1 className="max-w-4xl text-5xl font-black leading-[0.92] tracking-[-0.06em] text-[#17111a] sm:text-7xl lg:text-8xl">
            {dictionary.landing.heroTitle}
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-[#5f4659] sm:text-xl">
            {dictionary.landing.heroSubtitle}
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <a
              className="inline-flex items-center justify-center rounded-full bg-brand px-7 py-4 text-base font-black text-white shadow-soft transition hover:-translate-y-1 hover:opacity-90"
              href={publicConfig.extensionDownloadUrl}
            >
              {dictionary.landing.primaryCta}
            </a>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-[#2a182f]/15 bg-white/70 px-7 py-4 text-base font-black text-[#17111a] shadow-[0_18px_44px_rgba(23,17,26,0.08)] transition hover:-translate-y-1 hover:border-[#17111a]/30 hover:bg-white"
              href={dashboardHref}
            >
              {dictionary.landing.secondaryCta}
            </Link>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl lg:mr-0">
          <div className="absolute -left-8 top-10 h-28 w-28 rounded-[2rem] bg-[#f7c948] shadow-[0_24px_60px_rgba(247,201,72,0.28)]" />
          <div className="absolute -right-6 bottom-12 h-32 w-32 rounded-full bg-brand/25 blur-sm" />
          <div className="relative rounded-[2.5rem] border border-[#2a182f]/10 bg-white/80 p-4 shadow-[0_34px_90px_rgba(74,32,66,0.18)] backdrop-blur-xl">
            <div className="rounded-[2rem] bg-[#17111a] p-5 text-white">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#ff7ab8]" />
                  <span className="h-3 w-3 rounded-full bg-[#f7c948]" />
                  <span className="h-3 w-3 rounded-full bg-[#74e0c1]" />
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/70">Witness ready</span>
              </div>
              <div className="space-y-3">
                <div className="rounded-3xl bg-white/10 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ffb3d7]">Prompt</p>
                  <p className="mt-2 text-sm leading-6 text-white/80">Preserve this answer as verifiable evidence.</p>
                </div>
                <div className="ml-8 rounded-3xl bg-[#fff7fb] p-4 text-[#17111a]">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-brand">Sui-Seal</p>
                  <p className="mt-2 text-sm leading-6 text-[#4c3447]">Encrypted archive created. Walrus blob pinned. Sui witness transaction signed.</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3 text-center text-xs font-bold text-white/70">
                <span className="rounded-2xl bg-white/10 px-3 py-3">Encrypt</span>
                <span className="rounded-2xl bg-white/10 px-3 py-3">Store</span>
                <span className="rounded-2xl bg-white/10 px-3 py-3">Witness</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="product" className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-20">
        <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-brand">Product</p>
            <h2 className="mt-4 max-w-xl text-4xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">
              {dictionary.landing.valueTitle}
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {dictionary.landing.valueItems.map((item, index) => (
              <article key={item.title} className="rounded-[2rem] border border-[#2a182f]/10 bg-white/75 p-6 shadow-[0_20px_60px_rgba(74,32,66,0.08)]">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#17111a] text-sm font-black text-white">
                  0{index + 1}
                </span>
                <h3 className="mt-8 text-lg font-black leading-7 text-[#231824]">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#5f4659]">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-20">
        <div className="rounded-[2.5rem] bg-[#17111a] p-6 text-white shadow-[0_34px_90px_rgba(23,17,26,0.18)] sm:p-10 lg:p-12">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ffb3d7]">Workflow</p>
              <h2 className="mt-4 text-4xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">
                {dictionary.landing.workflowTitle}
              </h2>
            </div>
            <ol className="grid gap-4">
              {dictionary.landing.workflowItems.map((item, index) => (
                <li key={item.title} className="flex gap-4 rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand text-sm font-black text-white">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-base font-black leading-7 text-white">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-white/75">{item.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-20">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <h2 className="max-w-2xl text-4xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">
            {dictionary.landing.platformsTitle}
          </h2>
          <span className="rounded-full bg-[#17111a] px-5 py-3 text-sm font-black text-white">4 platforms</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {platforms.map((platform) => (
            <article key={platform} className="group rounded-[2rem] border border-[#2a182f]/10 bg-white/75 p-6 shadow-[0_18px_50px_rgba(74,32,66,0.08)] transition hover:-translate-y-1 hover:bg-white">
              <div className="mb-12 h-16 rounded-[1.35rem] bg-gradient-to-br from-brand via-[#ff8fca] to-[#f7c948] opacity-80 transition group-hover:opacity-100" />
              <h3 className="text-2xl font-black tracking-[-0.03em]">{platform}</h3>
            </article>
          ))}
        </div>
      </section>

      <section id="install" className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-20">
        <div className="grid gap-8 rounded-[2.5rem] border border-[#2a182f]/10 bg-white/70 p-6 shadow-[0_26px_80px_rgba(74,32,66,0.1)] sm:p-10 lg:grid-cols-[0.75fr_1.25fr] lg:p-12">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-brand">Install</p>
            <h2 className="mt-4 text-4xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">
              {dictionary.landing.installTitle}
            </h2>
          </div>
          <ol className="grid gap-4">
            {dictionary.landing.installSteps.map((step, index) => (
              <li key={step} className="flex items-center gap-4 rounded-[1.75rem] bg-[#fff7fb] p-5 ring-1 ring-[#2a182f]/8">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand text-base font-black text-white">
                  {index + 1}
                </span>
                <p className="text-lg font-black leading-7 text-[#231824]">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-20">
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-brand">FAQ</p>
          <h2 className="mt-4 text-4xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">
            {dictionary.landing.faqTitle}
          </h2>
        </div>
        <div className="mt-10 space-y-4">
          {dictionary.landing.faqs.map((faq) => (
            <details key={faq.question} className="group rounded-[1.75rem] border border-[#2a182f]/10 bg-white/75 p-6 shadow-[0_18px_50px_rgba(74,32,66,0.07)] open:bg-white">
              <summary className="cursor-pointer list-none text-lg font-black leading-7 text-[#231824] marker:hidden">
                <span className="flex items-center justify-between gap-4">
                  {faq.question}
                  <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#17111a] text-white transition group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="mt-4 max-w-3xl text-base leading-7 text-[#5f4659]">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 pb-20 sm:px-8 sm:py-20 sm:pb-28">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-brand p-8 text-white shadow-soft sm:p-12 lg:p-16">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/20" />
          <div className="absolute -bottom-20 left-20 h-64 w-64 rounded-full bg-[#17111a]/15 blur-2xl" />
          <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
            <h2 className="max-w-3xl text-4xl font-black leading-tight tracking-[-0.05em] sm:text-6xl">
              {dictionary.landing.finalTitle}
            </h2>
            <a
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-white px-7 py-4 text-base font-black text-[#17111a] shadow-[0_20px_50px_rgba(23,17,26,0.18)] transition hover:-translate-y-1"
              href={publicConfig.extensionDownloadUrl}
            >
              {dictionary.landing.finalCta}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
