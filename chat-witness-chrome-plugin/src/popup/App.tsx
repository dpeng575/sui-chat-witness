import { useState, useEffect, type ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { conversationToMarkdown, downloadMarkdown, generateFilename } from '../utils/export';
import { prepareWitness } from '../lib/witness';
import { getWitnessRecords } from '../db';
import type { WitnessRecord } from '../db/types';
import { downloadFromWalrus, downloadWalrusBlob } from '../lib/walrus';
import type { Conversation } from '../adapters/interface';
import logoUrl from '../assets/Chat-Witness-logo.png';

const SIGNER_URL = import.meta.env.VITE_SIGNER_URL || 'http://localhost:3000/en/signer';
const RECORDS_PAGE_SIZE = 5;

const aiPlatforms = [
  {
    name: 'ChatGPT',
    url: 'https://chat.openai.com/',
    color: '#10a37f',
    logo: (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="h-6 w-6">
        <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.4" d="M24 7.5c5.5 0 8.6 3.4 9.4 7.4 4.1 1.2 7.1 4.7 7.1 9.1 0 5.1-3.9 8.9-8.7 9.5-1.4 4.1-5 7-9.6 7-4.5 0-7.7-2.7-9.1-6.4-4.3-1-7.6-4.7-7.6-9.2 0-4.7 3.3-8.1 7.3-9.2C14 11 17.9 7.5 24 7.5Z" />
        <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.4" d="M16.2 16.6 24 12l7.8 4.6v9.1L24 30.3l-7.8-4.6v-9.1Zm15.6 0L24 21.1m0-9.1v9.1m0 9.2v5.8m-7.8-10.4L24 21.1l7.8 4.6" />
      </svg>
    ),
  },
  {
    name: 'Claude',
    url: 'https://claude.ai/',
    color: '#d97757',
    logo: (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="h-6 w-6">
        <path fill="currentColor" d="M23.8 6 42 40H31.8l-3-6.2h-10L15.9 40H6L23.8 6Zm1.1 17.1-3.1 6.8h5.9l-2.8-6.8Z" />
      </svg>
    ),
  },
  {
    name: 'Gemini',
    url: 'https://gemini.google.com/',
    color: '#8b5cf6',
    logo: (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="h-6 w-6">
        <path fill="currentColor" d="M24 4c2.4 11.1 8.9 17.6 20 20-11.1 2.4-17.6 8.9-20 20C21.6 32.9 15.1 26.4 4 24 15.1 21.6 21.6 15.1 24 4Z" />
      </svg>
    ),
  },
  {
    name: 'Kimi',
    url: 'https://kimi.moonshot.cn/',
    color: '#94a3b8',
    logo: (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="h-6 w-6">
        <path fill="currentColor" d="M33.9 7.4A18.8 18.8 0 1 0 41 33.1 14.7 14.7 0 1 1 33.9 7.4Z" />
        <path fill="rgb(226, 61, 124)" d="M32 18.5 36 21l4-2.5-2.5 4 2.5 4-4-2.5-4 2.5 2.5-4-2.5-4Z" />
      </svg>
    ),
  },
];

function App() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const [currentPlatform, setCurrentPlatform] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isWitnessing, setIsWitnessing] = useState(false);
  const [witnessResult, setWitnessResult] = useState<any>(null);
  const [records, setRecords] = useState<WitnessRecord[]>([]);
  const [recordsPage, setRecordsPage] = useState(0);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [downloadingBlobId, setDownloadingBlobId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    detectCurrentPlatform();
  }, []);

  useEffect(() => {
    loadWitnessRecords(0);
  }, []);

  async function detectCurrentPlatform() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'detectPlatform' });
      if (response?.success) {
        setCurrentPlatform(response.platform);
        console.log('[Popup] Detected platform:', response.platform);
      }
    } catch {
    }
  }

  async function openPlatform(url: string) {
    await chrome.tabs.create({ url, active: true });
  }

  async function getCurrentConversation() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      showStatus('No active tab found', 'error');
      return null;
    }

    const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractConversation' });
    console.log('[Popup] Received response:', response);
    if (response?.success && response.conversation) {
      const nextConversation = response.conversation as Conversation;
      return nextConversation;
    }

    showStatus(response?.error || 'Unable to extract conversation', 'error');
    return null;
  }

  async function exportConversationToMarkdown(nextConversation: Conversation) {
    console.log('[Popup] Exporting conversation:', nextConversation);
    const markdown = conversationToMarkdown(nextConversation);
    console.log('[Popup] Generated markdown:', markdown);
    const filename = generateFilename(nextConversation);
    downloadMarkdown(markdown, filename);
  }

  async function exportCurrentConversationToMarkdown() {
    setIsExtracting(true);
    setStatusMessage(null);

    try {
      const nextConversation = await getCurrentConversation();
      if (!nextConversation) return;

      exportConversationToMarkdown(nextConversation);
      showStatus('Conversation exported.', 'success');
    } catch (e) {
      console.log('[Popup] Export error:', e);
      showStatus('Unable to export this conversation. Refresh and try again.', 'error');
    } finally {
      setIsExtracting(false);
    }
  }

  async function openWitnessSigner(nextConversation: Conversation) {
    setIsWitnessing(true);
    setWitnessResult(null);
    setStatusMessage(null);

    try {
      showStatus('Preparing witness...', 'success');

      const prepared = await prepareWitness(
        nextConversation.messages,
        nextConversation.platform,
        nextConversation.title,
        nextConversation.url,
      );

      if (!prepared.success || !prepared.witnessRecordId || !prepared.walrusBlobId || !prepared.conversationHash) {
        setWitnessResult(prepared);
        showStatus(prepared.error || 'Failed to prepare witness', 'error');
        return;
      }

      const payload = {
        extensionId: chrome.runtime.id,
        requestId: crypto.randomUUID?.() ?? Date.now().toString(),
        witnessRecordId: prepared.witnessRecordId,
        conversationHash: prepared.conversationHash,
        walrusBlobId: prepared.walrusBlobId,
        platform: nextConversation.platform,
        conversationTitle: nextConversation.title,
        conversationUrl: nextConversation.url,
        messages: nextConversation.messages,
        messageCount: nextConversation.messages.length,
      };

      await chrome.tabs.create({
        url: `${SIGNER_URL}#${encodeURIComponent(JSON.stringify(payload))}`,
        active: true,
      });

      setWitnessResult({
        success: true,
        witnessRecordId: prepared.witnessRecordId,
        walrusBlobId: prepared.walrusBlobId,
        conversationHash: prepared.conversationHash,
      });
      await loadWitnessRecords(0);
      showStatus('Wallet signing page opened. Complete the transaction there.', 'success');
    } catch (error) {
      console.error('[Popup] Witness error:', error);
      const message = error instanceof Error ? error.message : 'Witness failed';
      setWitnessResult({ success: false, error: message });
      showStatus(message, 'error');
    } finally {
      setIsWitnessing(false);
    }
  }

  async function uploadCurrentConversationToWalrus() {
    setIsExtracting(true);
    setStatusMessage(null);

    try {
      const nextConversation = await getCurrentConversation();
      if (!nextConversation) return;

      await openWitnessSigner(nextConversation);
    } catch (e) {
      console.log('[Popup] Witness extraction error:', e);
      showStatus('Unable to extract this conversation. Refresh and try again.', 'error');
    } finally {
      setIsExtracting(false);
    }
  }


  async function loadWitnessRecords(page: number) {
    setIsLoadingRecords(true);
    try {
      const result = await getWitnessRecords(page, RECORDS_PAGE_SIZE);
      setRecords(result.records);
      setRecordsTotal(result.total);
      setRecordsPage(page);
    } catch (error) {
      console.error('[Popup] Load records error:', error);
      showStatus('Failed to load witness records', 'error');
    } finally {
      setIsLoadingRecords(false);
    }
  }

  async function downloadRecordBlob(record: WitnessRecord) {
    if (record.seal_encrypted) {
      if (!record.sui_object_id || !record.conversation_hash) {
        showStatus('This record is missing the on-chain object ID or conversation hash required for Seal decryption.', 'error');
        return;
      }

      const payload = {
        mode: 'decrypt',
        conversationHash: record.conversation_hash,
        walrusBlobId: record.walrus_blob_id,
        suiObjectId: record.sui_object_id,
        conversationTitle: record.conversation_title,
        platform: record.platform,
      };

      await chrome.tabs.create({
        url: `${SIGNER_URL}#${encodeURIComponent(JSON.stringify(payload))}`,
        active: true,
      });
      showStatus('Wallet decrypt page opened. Connect the wallet that owns this record.', 'success');
      return;
    }

    setDownloadingBlobId(record.walrus_blob_id);
    try {
      const bytes = await downloadFromWalrus(record.walrus_blob_id);
      downloadWalrusBlob(record.walrus_blob_id, bytes);
      showStatus('Walrus source file download started.', 'success');
    } catch (error) {
      console.error('[Popup] Download Walrus blob error:', error);
      showStatus(error instanceof Error ? error.message : 'Failed to download Walrus file', 'error');
    } finally {
      setDownloadingBlobId(null);
    }
  }

  function showStatus(text: string, type: 'success' | 'error' = 'success') {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 4000);
  }

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#070711] p-4 text-white">
        <div className="grid min-h-[480px] place-items-center">
          <div className="h-8 w-8 animate-spin border-2 border-white/15 border-b-brand" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen w-full bg-[#070711] p-4 text-white">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(226,61,124,0.32),transparent_36%),linear-gradient(180deg,#080814_0%,#10101d_55%,#070711_100%)]" />
        <div className="relative space-y-5">
          <BrandHeader />
          <PlatformShortcuts onOpenPlatform={openPlatform} />
          <section className="border border-white/10 bg-white/[0.06] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.3)] backdrop-blur">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff8fbd]">Secure archive</p>
            <h1 className="mt-3 text-2xl font-black tracking-[-0.05em]">Capture AI conversations with verifiable proof.</h1>
            <p className="mt-2 text-sm leading-6 text-white/62">Sign in to sync witness records and manage encrypted exports.</p>
            <button
              onClick={signInWithGoogle}
              className="mt-5 flex w-full items-center justify-center gap-2 bg-brand px-4 py-3 text-sm font-black text-white shadow-[0_18px_52px_rgba(226,61,124,0.34)] transition hover:-translate-y-0.5"
            >
              <GoogleIcon />
              Sign in with Google
            </button>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#070711] p-4 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(226,61,124,0.32),transparent_36%),linear-gradient(180deg,#080814_0%,#10101d_55%,#070711_100%)]" />
      <div className="relative space-y-4">
        <div className="flex items-center justify-between gap-3">
          <BrandHeader compact />
          <button
            onClick={signOut}
            className="border border-white/12 bg-white/[0.06] px-3 py-2 text-xs font-bold text-white/78 transition hover:bg-white/[0.12]"
          >
            Sign out
          </button>
        </div>

        <PlatformShortcuts onOpenPlatform={openPlatform} />

        {statusMessage && (
          <div className={`border p-3 text-sm font-bold ${
            statusMessage.type === 'error'
              ? 'border-red-400/30 bg-red-500/10 text-red-200'
              : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
          }`}>
            {statusMessage.text}
          </div>
        )}

        <section className="border border-white/10 bg-white/[0.06] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.3)] backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff8fbd]">Active target</p>
              <h2 className="mt-1 text-lg font-black text-white">{currentPlatform || 'No supported page detected'}</h2>
              <p className="mt-1 text-xs leading-5 text-white/55">
                {currentPlatform ? 'Ready to extract the current conversation.' : 'Open an AI chat page and refresh detection.'}
              </p>
            </div>
            <div className="grid h-11 w-11 place-items-center border border-brand/35 bg-brand/15 text-brand">
              <CaptureIcon />
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <SectionTitle>Conversation actions</SectionTitle>
          <button
            onClick={exportCurrentConversationToMarkdown}
            disabled={isExtracting || !currentPlatform}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#e23d7c] bg-[#e23d7c] px-5 py-4 text-sm font-black uppercase tracking-[0.12em] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.12)_inset,0_20px_62px_rgba(226,61,124,0.56)] ring-2 ring-brand/30 transition hover:-translate-y-0.5 hover:bg-[#f04f8c] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.2)_inset,0_26px_78px_rgba(226,61,124,0.68)] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-white/42 disabled:shadow-none disabled:ring-0 disabled:hover:translate-y-0"
          >
            <DownloadIcon />
            {isExtracting ? 'Extracting...' : 'Export as Markdown'}
          </button>

          <button
            onClick={uploadCurrentConversationToWalrus}
            disabled={isExtracting || isWitnessing || !currentPlatform}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#e23d7c] bg-[#e23d7c] px-5 py-4 text-sm font-black uppercase tracking-[0.12em] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.12)_inset,0_20px_62px_rgba(226,61,124,0.56)] ring-2 ring-brand/30 transition hover:-translate-y-0.5 hover:bg-[#f04f8c] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.2)_inset,0_26px_78px_rgba(226,61,124,0.68)] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-white/42 disabled:shadow-none disabled:ring-0 disabled:hover:translate-y-0"
          >
            <UploadIcon />
            {isWitnessing ? 'Preparing...' : isExtracting ? 'Extracting...' : 'Upload to Walrus'}
          </button>
        </section>


        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <SectionTitle>Witness records</SectionTitle>
            <button
              onClick={() => loadWitnessRecords(recordsPage)}
              disabled={isLoadingRecords}
              className="text-xs font-black text-[#ff8fbd] transition hover:text-white disabled:opacity-50"
            >
              {isLoadingRecords ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          <div className="space-y-2 border border-white/10 bg-white/[0.06] p-3">
            {records.length === 0 ? (
              <div className="py-2 text-xs text-white/52">
                {isLoadingRecords ? 'Loading witness records...' : 'No witness records yet.'}
              </div>
            ) : (
              records.map((record) => (
                <div key={record.id} className="border border-white/10 bg-[#0b0b18]/70 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-black text-white">
                        {record.conversation_title || record.platform}
                      </div>
                      <div className="text-[11px] text-white/45">
                        {new Date(record.created_at).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => downloadRecordBlob(record)}
                      disabled={downloadingBlobId === record.walrus_blob_id}
                      className="shrink-0 text-xs font-black text-[#ff8fbd] transition hover:text-white disabled:opacity-50"
                    >
                      {downloadingBlobId === record.walrus_blob_id ? 'Downloading...' : record.seal_encrypted ? 'Decrypt Markdown' : 'Download source'}
                    </button>
                  </div>

                  <div className="mt-2 space-y-1 text-[11px] text-white/52">
                    <RecordMeta label="Walrus" value={record.walrus_blob_id} />
                    <RecordMeta label="Tx" value={record.sui_transaction_digest} />
                    {record.sui_object_id && <RecordMeta label="Object" value={record.sui_object_id} />}
                    {record.walrus_storage_start_at && (
                      <div>
                        <span className="font-bold text-white/68">Storage start:</span>
                        <span className="ml-1">{new Date(record.walrus_storage_start_at).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            <div className="flex items-center justify-between border-t border-white/10 pt-3">
              <button
                onClick={() => loadWitnessRecords(recordsPage - 1)}
                disabled={recordsPage === 0 || isLoadingRecords}
                className="text-xs font-bold text-white/58 transition hover:text-white disabled:opacity-30"
              >
                Previous
              </button>
              <div className="text-xs text-white/45">
                Page {recordsPage + 1} / {Math.max(1, Math.ceil(recordsTotal / RECORDS_PAGE_SIZE))}
              </div>
              <button
                onClick={() => loadWitnessRecords(recordsPage + 1)}
                disabled={(recordsPage + 1) * RECORDS_PAGE_SIZE >= recordsTotal || isLoadingRecords}
                className="text-xs font-bold text-white/58 transition hover:text-white disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        </section>

        {witnessResult && (
          <div className={`border p-3 ${
            witnessResult.success
              ? 'border-emerald-400/30 bg-emerald-500/10'
              : 'border-red-400/30 bg-red-500/10'
          }`}>
            <div className={`mb-2 text-sm font-black ${
              witnessResult.success ? 'text-emerald-200' : 'text-red-200'
            }`}>
              {witnessResult.success ? 'Witness created' : 'Witness failed'}
            </div>
            {witnessResult.success && witnessResult.suiTransactionDigest && (
              <div className="space-y-1">
                <div className="text-xs text-emerald-200/80">
                  <span className="font-bold">Tx:</span>
                  <a
                    href={`https://suiscan.xyz/testnet/tx/${witnessResult.suiTransactionDigest}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 font-mono underline"
                  >
                    {witnessResult.suiTransactionDigest.substring(0, 16)}...
                  </a>
                </div>
                {witnessResult.walrusBlobId && <RecordMeta label="Walrus" value={`${witnessResult.walrusBlobId.substring(0, 16)}...`} />}
                {witnessResult.conversationHash && <RecordMeta label="Hash" value={`${witnessResult.conversationHash.substring(0, 16)}...`} />}
              </div>
            )}
            {!witnessResult.success && witnessResult.error && (
              <div className="text-xs text-red-200/80">{witnessResult.error}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function BrandHeader({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`${compact ? 'h-10 w-10' : 'h-12 w-12'} overflow-hidden rounded-2xl border border-white/20 bg-white shadow-[0_0_34px_rgba(226,61,124,0.38)]`}>
        <img src={logoUrl} alt="chat-witness logo" className="h-full w-full object-cover" />
      </div>
      <div>
        <div className="text-sm font-black uppercase tracking-[0.2em] text-white">chat-witness</div>
        {!compact && <div className="text-xs font-semibold text-white/52">AI Conversation Archive</div>}
      </div>
    </div>
  );
}

function PlatformShortcuts({ onOpenPlatform }: { onOpenPlatform: (url: string) => Promise<void> }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {aiPlatforms.map((platform) => (
        <button
          key={platform.name}
          onClick={() => onOpenPlatform(platform.url)}
          title={platform.name}
          className="grid h-12 place-items-center border border-white/10 bg-white/[0.06] shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:border-brand/50 hover:bg-brand/10"
          style={{ color: platform.color }}
        >
          {platform.logo}
        </button>
      ))}
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="text-xs font-black uppercase tracking-[0.18em] text-white/48">{children}</div>;
}

function RecordMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-bold text-white/68">{label}:</span>
      <span className="ml-1 break-all font-mono">{value}</span>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function CaptureIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5h14v14H5zM8 9h8M8 13h5" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 5v11m0 0 4-4m-4 4-4-4M5 19h14" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 16V5m0 0 4 4m-4-4-4 4M5 16v3h14v-3" />
    </svg>
  );
}

export default App;
