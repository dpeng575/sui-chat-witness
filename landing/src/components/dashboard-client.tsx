'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ConnectButton, useCurrentAccount, useSignPersonalMessage } from '@mysten/dapp-kit';

import type { Dictionary, Locale } from '@/lib/i18n';
import {
  getCurrentUser,
  getSupabaseBrowserClient,
  signOut,
  type AppUser,
} from '@/lib/supabase';
import {
  getDashboardErrorMessage,
  isDashboardConfigurationError,
  safelySetupAuthStateSubscription,
  safelySignInWithGoogle,
} from './dashboard-auth';
import {
  getDashboardDownloadAction,
  getRecordsSummary,
  getWitnessRecords,
  type WitnessRecord,
} from '@/lib/witness-records';
import { publicConfig } from '@/lib/config';
import { downloadBytes, downloadMarkdown, safeMarkdownFilename } from '@/lib/download';

const PAGE_SIZE = 10;

function shorten(value: string, visible = 6) {
  if (value.length <= visible * 2 + 3) {
    return value;
  }

  return `${value.slice(0, visible)}...${value.slice(-visible)}`;
}

function RecordsTable({
  records,
  dictionary,
  onDownload,
  downloadingId,
}: {
  records: WitnessRecord[];
  dictionary: Dictionary;
  onDownload: (record: WitnessRecord) => Promise<void>;
  downloadingId: string | null;
}) {
  return (
    <div className="mt-6 overflow-hidden rounded-lg border border-white/10 bg-white/[0.06] shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10 text-left">
          <thead className="bg-white/[0.06] text-xs font-black uppercase tracking-[0.16em] text-white/60">
            <tr>
              <th scope="col" className="px-5 py-4">{dictionary.dashboard.tableTitle}</th>
              <th scope="col" className="px-5 py-4">{dictionary.dashboard.tablePlatform}</th>
              <th scope="col" className="px-5 py-4">{dictionary.dashboard.tableMessages}</th>
              <th scope="col" className="px-5 py-4">{dictionary.dashboard.tableCreated}</th>
              <th scope="col" className="px-5 py-4">{dictionary.dashboard.tableWalrus}</th>
              <th scope="col" className="px-5 py-4">{dictionary.dashboard.tableTransaction}</th>
              <th scope="col" className="px-5 py-4 text-right">{dictionary.dashboard.tableActions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/8 text-sm">
            {records.map((record) => {
              const title = record.conversation_title || 'Untitled conversation';
              const txUrl = `${publicConfig.suiExplorerBaseUrl}/tx/${record.sui_transaction_digest}`;
              const isDownloading = downloadingId === record.id;
              const isSeal = Boolean(record.seal_encrypted);

              return (
                <tr key={record.id} className="align-middle transition hover:bg-brand/10">
                  <td className="max-w-[18rem] px-5 py-4">
                    <p className="truncate font-black text-white" title={title}>{title}</p>
                    {record.sui_object_id && (
                      <p className="mt-1 truncate font-mono text-xs text-white/45" title={record.sui_object_id}>
                        Object {shorten(record.sui_object_id)}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className="bg-brand/15 px-3 py-1 text-xs font-black text-[#ff8fbd] ring-1 ring-brand/30">{record.platform}</span>
                  </td>
                  <td className="px-5 py-4 font-bold text-white/62">{record.message_count ?? '-'}</td>
                  <td className="px-5 py-4 font-bold text-white/62">{new Date(record.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-4 font-mono text-xs text-white/58" title={record.walrus_blob_id}>{shorten(record.walrus_blob_id)}</td>
                  <td className="px-5 py-4">
                    <a
                      href={txUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`View transaction ${record.sui_transaction_digest} in new tab`}
                      className="font-mono text-xs font-black text-[#ff8fbd] transition hover:text-white"
                      title={record.sui_transaction_digest}
                    >
                      {shorten(record.sui_transaction_digest)}
                    </a>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      data-record-download
                      onClick={() => onDownload(record)}
                      disabled={isDownloading}
                      className="bg-brand px-4 py-2 text-xs font-black text-white shadow-[0_10px_30px_rgba(226,61,124,0.24)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                      {isDownloading
                        ? dictionary.dashboard.decrypting
                        : isSeal
                          ? dictionary.dashboard.downloadMarkdown
                          : dictionary.dashboard.downloadOriginal}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DashboardClient({
  locale,
  dictionary,
}: {
  locale: Locale;
  dictionary: Dictionary;
}) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [records, setRecords] = useState<WitnessRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const currentAccount = useCurrentAccount();
  const signPersonalMessage = useSignPersonalMessage();

  const summary = useMemo(() => getRecordsSummary(records), [records]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canGoPrevious = page > 0;
  const canGoNext = page + 1 < totalPages;
  const pageStart = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const pageEnd = Math.min((page + 1) * PAGE_SIZE, total);

  const downloadRecord = useCallback(
    async (record: WitnessRecord) => {
      setDownloadingId(record.id);
      setStatus(null);

      try {
        const { createSealSessionKey, decryptMarkdown, downloadStoredFile } = await import('@/lib/storage');
        const downloadAction = getDashboardDownloadAction(record);

        if (downloadAction === 'original') {
          const bytes = await downloadStoredFile(record.walrus_blob_id);
          downloadBytes(bytes, `${record.walrus_blob_id}.bin`);
          return;
        }

        if (downloadAction === 'missing-seal-fields') {
          setStatus(dictionary.dashboard.missingSealFields);
          return;
        }

        if (!currentAccount) {
          setStatus('Please connect your wallet to decrypt this record.');
          return;
        }

        const encryptedBytes = await downloadStoredFile(record.walrus_blob_id);
        const sessionKey = await createSealSessionKey(currentAccount.address);
        const signature = await signPersonalMessage.mutateAsync({
          message: sessionKey.getPersonalMessage(),
          account: currentAccount,
          chain: 'sui:testnet',
        });
        await sessionKey.setPersonalMessageSignature(signature.signature);

        const markdown = await decryptMarkdown({
          encryptedBytes,
          conversationHash: record.conversation_hash!,
          witnessObjectId: record.sui_object_id!,
          sessionKey,
          sender: currentAccount.address,
        });

        downloadMarkdown(markdown, safeMarkdownFilename(record.conversation_title));
      } catch (error) {
        console.error('Download failed:', error);
        setStatus(error instanceof Error ? error.message : 'Download failed. Please try again.');
      } finally {
        setDownloadingId(null);
      }
    },
    [currentAccount, dictionary.dashboard.missingSealFields, signPersonalMessage],
  );

  const loadRecords = useCallback(async (nextPage: number = 0, mode: 'refresh' | 'page' = 'refresh') => {
    if (mode === 'refresh') {
      setRefreshing(true);
    } else {
      setPageLoading(true);
    }
    setStatus(null);

    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        setUser(null);
        setRecords([]);
        setTotal(0);
        setPage(0);
        setLoading(false);
        return;
      }

      setUser(currentUser);

      const supabase = getSupabaseBrowserClient();
      const result = await getWitnessRecords(supabase, nextPage, PAGE_SIZE);

      setRecords(result.records);
      setTotal(result.total);
      setPage(nextPage);
    } catch (error) {
      if (!isDashboardConfigurationError(error)) {
        console.error('Error loading records:', error);
      }
      setStatus(getDashboardErrorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    loadRecords(0);

    const subscription = safelySetupAuthStateSubscription({
      onAuthStateChange: async (event, session) => {
        if (mounted) {
          if (session?.user) {
            loadRecords(0);
          } else {
            setUser(null);
            setRecords([]);
            setTotal(0);
            setPage(0);
          }
        }
      },
      setStatus,
      setLoading,
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [loadRecords]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#070711] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-center px-5 py-24">
          <div role="status" aria-live="polite" className="text-lg font-bold text-white/64">Loading...</div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#070711] text-white">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(226,61,124,0.28),transparent_34%),radial-gradient(circle_at_78%_18%,rgba(99,102,241,0.2),transparent_30%),linear-gradient(180deg,#080814_0%,#10101d_46%,#070711_100%)]" />

        <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#070711]/80 backdrop-blur-2xl">
          <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
            <Link href={`/${locale}`} className="group flex items-center gap-3">
              <span className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-2xl border border-white/20 bg-white shadow-[0_0_34px_rgba(226,61,124,0.45)] transition-transform group-hover:-rotate-6">
                <Image src="/Chat-Witness-logo.png" alt="chat-witness logo" width={44} height={44} className="h-full w-full object-cover" priority />
              </span>
              <span>
                <span className="block text-sm font-black uppercase tracking-[0.24em] text-white">chat-witness</span>
                <span className="block text-xs font-semibold text-white/55">AI Conversation Archive</span>
              </span>
            </Link>
          </nav>
        </header>

        <div className="mx-auto max-w-2xl px-5 pb-24 pt-40 text-center">
          <h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl">{dictionary.dashboard.title}</h1>
          <p className="mt-4 text-lg text-white/64">{dictionary.dashboard.loginRequired}</p>
          {status && (
            <div role="alert" className="mt-6 border border-red-400/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">{status}</div>
          )}
          <button
            onClick={() => safelySignInWithGoogle(locale, setStatus)}
            className="mt-8 inline-flex items-center justify-center bg-brand px-7 py-4 text-base font-black text-white shadow-[0_18px_60px_rgba(226,61,124,0.42)] transition hover:-translate-y-1 hover:opacity-90"
          >
            {dictionary.nav.signIn}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070711] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(226,61,124,0.28),transparent_34%),radial-gradient(circle_at_78%_18%,rgba(99,102,241,0.2),transparent_30%),linear-gradient(180deg,#080814_0%,#10101d_46%,#070711_100%)]" />
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [mask-image:linear-gradient(to_bottom,black,transparent_86%)]"
        style={{ backgroundSize: '56px 56px' }}
      />

      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#070711]/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href={`/${locale}`} className="group flex items-center gap-3">
            <span className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-2xl border border-white/20 bg-white shadow-[0_0_34px_rgba(226,61,124,0.45)] transition-transform group-hover:-rotate-6">
              <Image src="/Chat-Witness-logo.png" alt="chat-witness logo" width={44} height={44} className="h-full w-full object-cover" priority />
            </span>
            <span className="hidden sm:block">
              <span className="block text-sm font-black uppercase tracking-[0.24em] text-white">chat-witness</span>
              <span className="block text-xs font-semibold text-white/55">AI Conversation Archive</span>
            </span>
          </Link>

          <div className="flex flex-1 items-center justify-end gap-3">
            <ConnectButton connectText={dictionary.dashboard.connectWallet} />
            <button
              onClick={() => signOut()}
              className="border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white/78 transition-colors hover:bg-white/[0.12]"
            >
              {dictionary.nav.signOut}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 pb-12 pt-36 sm:px-8 sm:pt-40">
        <div>
          <h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl">{dictionary.dashboard.title}</h1>
          <p className="mt-4 text-lg text-white/64">{dictionary.dashboard.subtitle}</p>
        </div>

        {status && (
          <div role="alert" className="mt-6 border border-red-400/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">{status}</div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="border border-white/10 bg-white/[0.06] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.24)] backdrop-blur">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-brand">{dictionary.dashboard.totalRecords}</p>
            <p className="mt-2 text-4xl font-black text-white">{total}</p>
          </div>
          <div className="border border-white/10 bg-white/[0.06] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.24)] backdrop-blur">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-brand">{dictionary.dashboard.latestWitness}</p>
            <p className="mt-2 text-lg font-black text-white">
              {summary.latestCreatedAt ? new Date(summary.latestCreatedAt).toLocaleDateString() : '-'}
            </p>
          </div>
          <div className="border border-white/10 bg-white/[0.06] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.24)] backdrop-blur">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-brand">{dictionary.dashboard.platforms}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(summary.platformCounts).map(([platform, count]) => (
                <span key={platform} className="rounded-full bg-white/[0.06] px-3 py-1 text-sm font-bold text-white/68 ring-1 ring-white/10">
                  {platform}: {count}
                </span>
              ))}
              {Object.keys(summary.platformCounts).length === 0 && <span className="text-sm font-bold text-white/64">-</span>}
            </div>
          </div>
        </div>

        <div className="mt-10 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-black tracking-[-0.03em]">{dictionary.dashboard.records}</h2>
          <button
            onClick={() => loadRecords(0, 'refresh')}
            disabled={refreshing}
            className="border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-black text-white/78 transition hover:-translate-y-0.5 hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {refreshing ? 'Refreshing...' : dictionary.dashboard.refresh}
          </button>
        </div>

        {records.length === 0 ? (
          <div className="mt-6 border border-white/10 bg-white/[0.06] p-12 text-center shadow-[0_18px_50px_rgba(0,0,0,0.24)] backdrop-blur">
            <p className="text-lg font-bold text-white/64">{dictionary.dashboard.empty}</p>
          </div>
        ) : (
          <RecordsTable
            records={records}
            dictionary={dictionary}
            onDownload={downloadRecord}
            downloadingId={downloadingId}
          />
        )}

        <div className="mt-6 flex flex-col items-center justify-between gap-4 border border-white/10 bg-white/[0.06] px-5 py-4 shadow-[0_12px_34px_rgba(0,0,0,0.2)] backdrop-blur sm:flex-row">
          <p className="text-sm font-bold text-white/64">
            {pageStart}-{pageEnd} / {total}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => loadRecords(page - 1, 'page')}
              disabled={!canGoPrevious || pageLoading}
              className="border border-white/12 bg-white/[0.06] px-5 py-2 text-sm font-black text-white/78 transition hover:-translate-y-0.5 hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {dictionary.dashboard.previousPage}
            </button>
            <span className="border border-brand/30 bg-brand/15 px-4 py-2 text-sm font-black text-[#ff8fbd]">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => loadRecords(page + 1, 'page')}
              disabled={!canGoNext || pageLoading}
              className="bg-brand px-5 py-2 text-sm font-black text-white shadow-[0_12px_34px_rgba(226,61,124,0.26)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {pageLoading ? dictionary.dashboard.loadingPage : dictionary.dashboard.nextPage}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
