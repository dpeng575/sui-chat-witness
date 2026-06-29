import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

import type { Dictionary, Locale } from '@/lib/i18n';
import { switchLocalePath } from '@/lib/i18n';
import { publicConfig } from '@/lib/config';

type Platform = {
  name: string;
  color: string;
  logo: ReactNode;
};

const platforms: Platform[] = [
  {
    name: 'ChatGPT',
    color: '#10a37f',
    logo: (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="h-10 w-10">
        <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.2" d="M24 7.5c5.5 0 8.6 3.4 9.4 7.4 4.1 1.2 7.1 4.7 7.1 9.1 0 5.1-3.9 8.9-8.7 9.5-1.4 4.1-5 7-9.6 7-4.5 0-7.7-2.7-9.1-6.4-4.3-1-7.6-4.7-7.6-9.2 0-4.7 3.3-8.1 7.3-9.2C14 11 17.9 7.5 24 7.5Z" />
        <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.2" d="M16.2 16.6 24 12l7.8 4.6v9.1L24 30.3l-7.8-4.6v-9.1Zm15.6 0L24 21.1m0-9.1v9.1m0 9.2v5.8m-7.8-10.4L24 21.1l7.8 4.6" />
      </svg>
    ),
  },
  {
    name: 'Claude',
    color: '#d97757',
    logo: (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="h-10 w-10">
        <path fill="currentColor" d="M23.8 6 42 40H31.8l-3-6.2h-10L15.9 40H6L23.8 6Zm1.1 17.1-3.1 6.8h5.9l-2.8-6.8Z" />
      </svg>
    ),
  },
  {
    name: 'Gemini',
    color: '#6c5ce7',
    logo: (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="h-10 w-10">
        <defs>
          <linearGradient id="geminiGradient" x1="8" x2="40" y1="40" y2="8">
            <stop stopColor="#4285f4" />
            <stop offset="0.48" stopColor="#a142f4" />
            <stop offset="1" stopColor="#fbbc04" />
          </linearGradient>
        </defs>
        <path fill="url(#geminiGradient)" d="M24 4c2.4 11.1 8.9 17.6 20 20-11.1 2.4-17.6 8.9-20 20C21.6 32.9 15.1 26.4 4 24 15.1 21.6 21.6 15.1 24 4Z" />
      </svg>
    ),
  },
  {
    name: 'Kimi',
    color: '#111827',
    logo: (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="h-10 w-10">
        <path fill="currentColor" d="M33.9 7.4A18.8 18.8 0 1 0 41 33.1 14.7 14.7 0 1 1 33.9 7.4Z" />
        <path fill="#e23d7c" d="M32 18.5 36 21l4-2.5-2.5 4 2.5 4-4-2.5-4 2.5 2.5-4-2.5-4Z" />
      </svg>
    ),
  },
];

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
    <main className="min-h-screen overflow-hidden bg-[#070711] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(226,61,124,0.28),transparent_34%),radial-gradient(circle_at_78%_18%,rgba(99,102,241,0.2),transparent_30%),linear-gradient(180deg,#080814_0%,#10101d_46%,#070711_100%)]" />
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [mask-image:linear-gradient(to_bottom,black,transparent_86%)]"
        style={{ backgroundSize: '56px 56px' }}
      />

      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#070711]/80 backdrop-blur-2xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8" aria-label="Primary navigation">
          <Link href={`/${locale}`} className="group flex items-center gap-3" aria-label="chat-witness home">
            <span className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-2xl border border-white/20 bg-white shadow-[0_0_34px_rgba(226,61,124,0.45)] transition-transform group-hover:-rotate-6">
              <Image src="/Chat-Witness-logo.png" alt="chat-witness logo" width={44} height={44} className="h-full w-full object-cover" priority />
            </span>
            <span>
              <span className="block text-sm font-black uppercase tracking-[0.24em] text-white">chat-witness</span>
              <span className="block text-xs font-semibold text-white/55">AI Conversation Archive</span>
            </span>
          </Link>

          <div className="hidden items-center gap-8 text-sm font-bold text-white/65 md:flex">
            <a className="transition hover:text-white" href="#product">
              {dictionary.nav.product}
            </a>
            <a className="transition hover:text-white" href="#install">
              {dictionary.nav.install}
            </a>
            <a className="transition hover:text-white" href="#faq">
              {dictionary.nav.faq}
            </a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              className="rounded-full border border-white/15 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/75 transition hover:border-brand/60 hover:text-white"
              href={switchLocalePath(`/${locale}`, otherLocale)}
            >
              {otherLocale.toUpperCase()}
            </Link>
            <Link
              className="hidden rounded-full bg-white px-4 py-2 text-sm font-extrabold text-[#070711] shadow-[0_18px_40px_rgba(255,255,255,0.12)] transition hover:-translate-y-0.5 sm:inline-flex"
              href={dashboardHref}
            >
              {dictionary.nav.dashboard}
            </Link>
          </div>
        </nav>
      </header>

      <section className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-16 pt-32 sm:px-8 sm:pb-24 sm:pt-40 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:pb-28 lg:pt-44">
        <div>
          <p className="mb-6 inline-flex rounded-full border border-brand/35 bg-brand/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#ff8fbd] shadow-[0_0_30px_rgba(226,61,124,0.18)]">
            {dictionary.landing.badge}
          </p>
          <h1 className="max-w-4xl text-5xl font-black leading-[0.92] tracking-[-0.06em] text-white sm:text-7xl lg:text-8xl">
            {dictionary.landing.heroTitle}
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-white/68 sm:text-xl">
            {dictionary.landing.heroSubtitle}
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <a
              className="inline-flex items-center justify-center rounded-full bg-brand px-7 py-4 text-base font-black text-white shadow-[0_18px_60px_rgba(226,61,124,0.42)] transition hover:-translate-y-1 hover:opacity-90"
              href={publicConfig.extensionDownloadUrl} target="_blank"
            >
              {dictionary.landing.primaryCta}
            </a>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/8 px-7 py-4 text-base font-black text-white shadow-[0_18px_44px_rgba(0,0,0,0.24)] backdrop-blur transition hover:-translate-y-1 hover:border-white/30 hover:bg-white/12"
              href={dashboardHref}
            >
              {dictionary.landing.secondaryCta}
            </Link>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl lg:mr-0">
          <div className="absolute -left-8 top-10 h-28 w-28 rounded-[2rem] border border-brand/40 bg-brand/20 shadow-[0_0_80px_rgba(226,61,124,0.38)]" />
          <div className="absolute -right-8 bottom-14 h-40 w-40 rounded-full border border-cyan-300/20 bg-cyan-300/10 blur-sm" />
          <div className="relative rounded-[2.5rem] border border-white/12 bg-white/[0.07] p-4 shadow-[0_34px_120px_rgba(0,0,0,0.38)] backdrop-blur-2xl">
            <div className="rounded-[2rem] border border-white/10 bg-[#0b0b18] p-5 text-white">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex gap-2">
                  <span className="h-3 w-3 rounded-full bg-brand" />
                  <span className="h-3 w-3 rounded-full bg-[#f7c948]" />
                  <span className="h-3 w-3 rounded-full bg-[#74e0c1]" />
                </div>
                <span className="rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-bold text-[#ff8fbd]">Witness ready</span>
              </div>
              <div className="grid gap-3">
                <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-white/45">Prompt</p>
                  <p className="mt-2 text-sm leading-6 text-white/80">Preserve this answer as verifiable evidence.</p>
                </div>
                <div className="ml-8 rounded-3xl border border-brand/30 bg-brand/10 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff8fbd]">chat-witness</p>
                  <p className="mt-2 text-sm leading-6 text-white/80">Encrypted archive created. Walrus blob pinned. Sui witness transaction signed.</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3 text-center text-xs font-bold text-white/70">
                <span className="rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-3">Encrypt</span>
                <span className="rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-3">Store</span>
                <span className="rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-3">Witness</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="product" className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-20">
        <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ff8fbd]">Product</p>
            <h2 className="mt-4 max-w-xl text-4xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">
              {dictionary.landing.valueTitle}
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {dictionary.landing.valueItems.map((item, index) => (
              <article key={item.title} className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.24)] backdrop-blur transition hover:-translate-y-1 hover:border-brand/35">
                <span className="grid h-11 w-11 place-items-center rounded-2xl border border-brand/35 bg-brand/15 text-sm font-black text-[#ff8fbd]">
                  0{index + 1}
                </span>
                <h3 className="mt-8 text-lg font-black leading-7 text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/62">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-20">
        <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.06] p-6 text-white shadow-[0_34px_90px_rgba(0,0,0,0.3)] backdrop-blur sm:p-10 lg:p-12">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ff8fbd]">Workflow</p>
              <h2 className="mt-4 text-4xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">
                {dictionary.landing.workflowTitle}
              </h2>
            </div>
            <ol className="grid gap-4">
              {dictionary.landing.workflowItems.map((item, index) => (
                <li key={item.title} className="flex gap-4 rounded-[1.75rem] border border-white/10 bg-[#0b0b18]/70 p-5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand text-sm font-black text-white shadow-[0_0_32px_rgba(226,61,124,0.35)]">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-base font-black leading-7 text-white">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-white/64">{item.description}</p>
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
          <span className="rounded-full border border-brand/30 bg-brand/10 px-5 py-3 text-sm font-black text-[#ff8fbd]">4 platforms</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {platforms.map((platform) => (
            <article key={platform.name} className="group rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.26)] backdrop-blur transition hover:-translate-y-1 hover:border-brand/35 hover:bg-white/[0.09]">
              <div className="mb-12 flex h-16 w-16 items-center justify-center rounded-[1.35rem] border border-white/12 bg-white text-[#070711] shadow-[0_20px_60px_rgba(255,255,255,0.08)]" style={{ color: platform.color }}>
                {platform.logo}
              </div>
              <h3 className="text-2xl font-black tracking-[-0.03em] text-white">{platform.name}</h3>
            </article>
          ))}
        </div>
      </section>

      <section id="install" className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-20">
        <div className="grid gap-8 border border-white/10 bg-white/[0.06] p-6 shadow-[0_26px_80px_rgba(0,0,0,0.28)] backdrop-blur sm:p-10 lg:grid-cols-[0.72fr_1.28fr] lg:p-12">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ff8fbd]">Install</p>
            <h2 className="mt-4 text-4xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">
              {dictionary.landing.installTitle}
            </h2>
            <a
              className="mt-8 inline-flex items-center justify-center bg-brand px-6 py-3 text-sm font-black uppercase tracking-[0.14em] text-white shadow-[0_18px_50px_rgba(226,61,124,0.35)] transition hover:-translate-y-0.5 hover:opacity-90"
              href={publicConfig.extensionDownloadUrl} target="_blank"
            >
              {dictionary.landing.primaryCta}
            </a>
          </div>
          <div className="grid gap-4">
            <ol className="grid gap-4">
              {dictionary.landing.installSteps.map((step, index) => (
                <li key={step} className="flex items-center gap-4 border border-white/10 bg-[#0b0b18]/70 p-5">
                  <span className="grid h-12 w-12 shrink-0 place-items-center bg-brand text-base font-black text-white">
                    {index + 1}
                  </span>
                  <p className="text-lg font-black leading-7 text-white">{step}</p>
                </li>
              ))}
            </ol>
            <div className="border border-brand/30 bg-brand/10 p-5 shadow-[0_0_42px_rgba(226,61,124,0.12)]">
              <h3 className="text-xl font-black tracking-[-0.03em] text-white">{dictionary.landing.extensionInstallTitle}</h3>
              <p className="mt-2 text-sm leading-6 text-white/64">{dictionary.landing.extensionInstallDescription}</p>
              <ol className="mt-5 grid gap-3">
                {dictionary.landing.extensionInstallSteps.map((step, index) => (
                  <li key={step} className="flex gap-3 text-sm font-bold leading-6 text-white/78">
                    <span className="font-mono text-brand">0{index + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-20">
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ff8fbd]">FAQ</p>
          <h2 className="mt-4 text-4xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">
            {dictionary.landing.faqTitle}
          </h2>
        </div>
        <div className="mt-10 space-y-4">
          {dictionary.landing.faqs.map((faq) => (
            <details key={faq.question} className="group rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur open:border-brand/35">
              <summary className="cursor-pointer list-none text-lg font-black leading-7 text-white marker:hidden">
                <span className="flex items-center justify-between gap-4">
                  {faq.question}
                  <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand text-white transition group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="mt-4 max-w-3xl text-base leading-7 text-white/64">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 pb-20 sm:px-8 sm:py-20 sm:pb-28">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-brand p-8 text-white shadow-[0_24px_90px_rgba(226,61,124,0.38)] sm:p-12 lg:p-16">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/18" />
          <div className="absolute -bottom-20 left-20 h-64 w-64 rounded-full bg-[#070711]/25 blur-2xl" />
          <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
            <h2 className="max-w-3xl text-4xl font-black leading-tight tracking-[-0.05em] sm:text-6xl">
              {dictionary.landing.finalTitle}
            </h2>
            <a
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-white px-7 py-4 text-base font-black text-[#070711] shadow-[0_20px_50px_rgba(7,7,17,0.24)] transition hover:-translate-y-1"
              href={publicConfig.extensionDownloadUrl} target="_blank"
            >
              {dictionary.landing.finalCta}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
