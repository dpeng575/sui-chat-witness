'use client';

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

function RecordCard({
  record,
  dictionary,
  onDownload,
  downloadingId,
}: {
  record: WitnessRecord;
  dictionary: Dictionary;
  onDownload: (record: WitnessRecord) => Promise<void>;
  downloadingId: string | null;
}) {
  const title = record.conversation_title || 'Untitled conversation';
  const txUrl = `${publicConfig.suiExplorerBaseUrl}/tx/${record.sui_transaction_digest}`;
  const isDownloading = downloadingId === record.id;
  const isSeal = Boolean(record.seal_encrypted);

  return (
    <article className="rounded-[2rem] border border-[#2a182f]/10 bg-white/75 p-6 shadow-[0_18px_50px_rgba(74,32,66,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-black leading-7 text-[#231824]">{title}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-[#5f4659]">
            <span className="rounded-full bg-[#fff7fb] px-3 py-1">{record.platform}</span>
            {record.message_count != null && (
              <span className="rounded-full bg-[#fff7fb] px-3 py-1">
                {record.message_count} messages
              </span>
            )}
            <span className="rounded-full bg-[#fff7fb] px-3 py-1">
              {new Date(record.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        <a
          href={txUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View transaction ${record.sui_transaction_digest} in new tab`}
          className="shrink-0 rounded-full bg-brand/10 px-4 py-2 text-xs font-black text-brand transition hover:bg-brand/20"
        >
          {dictionary.dashboard.openTx}
        </a>
      </div>

      <div className="mt-4 space-y-2 text-xs font-mono text-[#5f4659]">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#4c3447]">Walrus:</span>
          <span className="truncate">{record.walrus_blob_id}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#4c3447]">Digest:</span>
          <span className="truncate">{record.sui_transaction_digest}</span>
        </div>
        {record.sui_object_id && (
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#4c3447]">Object:</span>
            <span className="truncate">{record.sui_object_id}</span>
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        <button
          data-record-download
          onClick={() => onDownload(record)}
          disabled={isDownloading}
          className="rounded-full bg-[#17111a] px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {isDownloading
            ? dictionary.dashboard.decrypting
            : isSeal
              ? dictionary.dashboard.downloadMarkdown
              : dictionary.dashboard.downloadOriginal}
        </button>
      </div>
    </article>
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const currentAccount = useCurrentAccount();
  const signPersonalMessage = useSignPersonalMessage();

  const summary = useMemo(() => getRecordsSummary(records), [records]);
  const hasMore = records.length < total;

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

  const loadRecords = useCallback(async (nextPage: number = 0) => {
    const isRefresh = nextPage === 0;
    const isLoadMore = nextPage > 0;

    if (isRefresh) {
      setRefreshing(true);
    } else if (isLoadMore) {
      setLoadingMore(true);
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

      if (nextPage === 0) {
        setRecords(result.records);
      } else {
        setRecords((prev) => [...prev, ...result.records]);
      }

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
      setLoadingMore(false);
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
      <main className="min-h-screen bg-[#fff7fb] text-[#17111a]">
        <div className="mx-auto flex max-w-7xl items-center justify-center px-5 py-24">
          <div role="status" aria-live="polite" className="text-lg font-bold text-[#5f4659]">Loading...</div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#fff7fb] text-[#17111a]">
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute left-[-10rem] top-[-8rem] h-96 w-96 rounded-full bg-[#ff8fca]/30 blur-3xl" />
        </div>

        <header className="sticky top-0 z-20 border-b border-[#2a182f]/10 bg-[#fff7fb]/85 backdrop-blur-xl">
          <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
            <Link href={`/${locale}`} className="group flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#17111a] text-sm font-black tracking-tight text-white shadow-[0_12px_30px_rgba(23,17,26,0.18)] transition-transform group-hover:-rotate-6">
                SS
              </span>
              <span>
                <span className="block text-sm font-black uppercase tracking-[0.24em] text-[#17111a]">Sui-Seal</span>
                <span className="block text-xs font-semibold text-[#7c556d]">Chat Witness</span>
              </span>
            </Link>
          </nav>
        </header>

        <div className="mx-auto max-w-2xl px-5 py-24 text-center">
          <h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl">{dictionary.dashboard.title}</h1>
          <p className="mt-4 text-lg text-[#5f4659]">{dictionary.dashboard.loginRequired}</p>
          {status && (
            <div role="alert" className="mt-6 rounded-[1.5rem] bg-red-50 p-4 text-sm font-bold text-red-700">{status}</div>
          )}
          <button
            onClick={() => safelySignInWithGoogle(locale, setStatus)}
            className="mt-8 inline-flex items-center justify-center rounded-full bg-brand px-7 py-4 text-base font-black text-white shadow-soft transition hover:-translate-y-1 hover:opacity-90"
          >
            {dictionary.nav.signIn}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fff7fb] text-[#17111a]">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-[-10rem] top-[-8rem] h-96 w-96 rounded-full bg-[#ff8fca]/30 blur-3xl" />
      </div>

      <header className="sticky top-0 z-20 border-b border-[#2a182f]/10 bg-[#fff7fb]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href={`/${locale}`} className="group flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#17111a] text-sm font-black tracking-tight text-white shadow-[0_12px_30px_rgba(23,17,26,0.18)] transition-transform group-hover:-rotate-6">
              SS
            </span>
            <span className="hidden sm:block">
              <span className="block text-sm font-black uppercase tracking-[0.24em] text-[#17111a]">Sui-Seal</span>
              <span className="block text-xs font-semibold text-[#7c556d]">Chat Witness</span>
            </span>
          </Link>

          <div className="flex flex-1 items-center justify-end gap-3">
            <ConnectButton connectText={dictionary.dashboard.connectWallet} />
            <button
              onClick={() => signOut()}
              className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
            >
              {dictionary.nav.signOut}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <div>
          <h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl">{dictionary.dashboard.title}</h1>
          <p className="mt-4 text-lg text-[#5f4659]">{dictionary.dashboard.subtitle}</p>
        </div>

        {status && (
          <div role="alert" className="mt-6 rounded-[1.5rem] bg-red-50 p-4 text-sm font-bold text-red-700">{status}</div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-[2rem] border border-[#2a182f]/10 bg-white/75 p-6 shadow-[0_18px_50px_rgba(74,32,66,0.08)]">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-brand">{dictionary.dashboard.totalRecords}</p>
            <p className="mt-2 text-4xl font-black text-[#17111a]">{total}</p>
          </div>
          <div className="rounded-[2rem] border border-[#2a182f]/10 bg-white/75 p-6 shadow-[0_18px_50px_rgba(74,32,66,0.08)]">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-brand">{dictionary.dashboard.latestWitness}</p>
            <p className="mt-2 text-lg font-black text-[#17111a]">
              {summary.latestCreatedAt ? new Date(summary.latestCreatedAt).toLocaleDateString() : '-'}
            </p>
          </div>
          <div className="rounded-[2rem] border border-[#2a182f]/10 bg-white/75 p-6 shadow-[0_18px_50px_rgba(74,32,66,0.08)]">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-brand">{dictionary.dashboard.platforms}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(summary.platformCounts).map(([platform, count]) => (
                <span key={platform} className="rounded-full bg-[#fff7fb] px-3 py-1 text-sm font-bold text-[#4c3447]">
                  {platform}: {count}
                </span>
              ))}
              {Object.keys(summary.platformCounts).length === 0 && <span className="text-sm font-bold text-[#5f4659]">-</span>}
            </div>
          </div>
        </div>

        <div className="mt-10 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-black tracking-[-0.03em]">{dictionary.dashboard.records}</h2>
          <button
            onClick={() => loadRecords(0)}
            disabled={refreshing}
            className="rounded-full bg-white px-4 py-2 text-sm font-black text-[#17111a] shadow-[0_12px_30px_rgba(23,17,26,0.08)] ring-1 ring-[#2a182f]/10 transition hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {refreshing ? 'Refreshing...' : dictionary.dashboard.refresh}
          </button>
        </div>

        {records.length === 0 ? (
          <div className="mt-6 rounded-[2rem] border border-[#2a182f]/10 bg-white/75 p-12 text-center shadow-[0_18px_50px_rgba(74,32,66,0.08)]">
            <p className="text-lg font-bold text-[#5f4659]">{dictionary.dashboard.empty}</p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {records.map((record) => (
              <RecordCard
                key={record.id}
                record={record}
                dictionary={dictionary}
                onDownload={downloadRecord}
                downloadingId={downloadingId}
              />
            ))}
          </div>
        )}

        {hasMore && (
          <div className="mt-8 text-center">
            <button
              onClick={() => loadRecords(page + 1)}
              disabled={loadingMore}
              className="inline-flex items-center justify-center rounded-full bg-white px-7 py-4 text-base font-black text-[#17111a] shadow-[0_18px_44px_rgba(23,17,26,0.08)] transition hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {loadingMore ? 'Loading...' : dictionary.dashboard.loadMore}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
