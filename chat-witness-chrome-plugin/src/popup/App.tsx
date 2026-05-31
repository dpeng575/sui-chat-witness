import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { conversationToMarkdown, downloadMarkdown, generateFilename } from '../utils/export';
import { prepareWitness } from '../lib/witness';
import { getWitnessRecords } from '../db';
import type { WitnessRecord } from '../db/types';
import { downloadFromWalrus, downloadWalrusBlob } from '../lib/walrus';
import type { Conversation } from '../adapters/interface';

const SIGNER_URL = import.meta.env.VITE_SIGNER_URL || 'http://localhost:5173/signer.html';
const RECORDS_PAGE_SIZE = 5;

function App() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const [currentPlatform, setCurrentPlatform] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
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
      // Content script may not be available on non-chat pages.
    }
  }

  async function extractConversation() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      showStatus('No active tab found', 'error');
      return;
    }

    setIsExtracting(true);
    setStatusMessage(null);

    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractConversation' });
      console.log('[Popup] Received response:', response);
      if (response?.success && response.conversation) {
        setConversation(response.conversation);
        showStatus('对话已提取！', 'success');
      } else {
        showStatus(response?.error || '无法提取对话', 'error');
      }
    } catch (e) {
      console.log('[Popup] Error:', e);
      showStatus('无法连接到页面，请刷新后重试', 'error');
    } finally {
      setIsExtracting(false);
    }
  }

  async function exportToMarkdown() {
    if (!conversation) {
      showStatus('没有可导出的对话', 'error');
      return;
    }

    console.log('[Popup] Exporting conversation:', conversation);
    const markdown = conversationToMarkdown(conversation);
    console.log('[Popup] Generated markdown:', markdown);
    const filename = generateFilename(conversation);
    downloadMarkdown(markdown, filename);
    showStatus('对话已导出！', 'success');
  }

  async function witnessToChain() {
    if (!conversation) {
      showStatus('没有可存证的对话', 'error');
      return;
    }

    setIsWitnessing(true);
    setWitnessResult(null);
    setStatusMessage(null);

    try {
      showStatus('正在准备存证...', 'success');

      const prepared = await prepareWitness(
        conversation.messages,
        conversation.platform,
        conversation.title,
        conversation.url,
      );

      if (!prepared.success || !prepared.witnessRecordId || !prepared.walrusBlobId || !prepared.conversationHash) {
        setWitnessResult(prepared);
        showStatus(prepared.error || '存证准备失败', 'error');
        return;
      }

      const payload = {
        extensionId: chrome.runtime.id,
        requestId: crypto.randomUUID?.() ?? Date.now().toString(),
        witnessRecordId: prepared.witnessRecordId,
        conversationHash: prepared.conversationHash,
        walrusBlobId: prepared.walrusBlobId,
        platform: conversation.platform,
        conversationTitle: conversation.title,
        conversationUrl: conversation.url,
        messages: conversation.messages,
        messageCount: conversation.messages.length,
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
      showStatus('已打开钱包签名页面，请在新页面完成交易', 'success');
    } catch (error) {
      console.error('[Popup] Witness error:', error);
      const message = error instanceof Error ? error.message : '存证失败';
      setWitnessResult({ success: false, error: message });
      showStatus(message, 'error');
    } finally {
      setIsWitnessing(false);
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
      showStatus('加载存证记录失败', 'error');
    } finally {
      setIsLoadingRecords(false);
    }
  }

  async function downloadRecordBlob(record: WitnessRecord) {
    if (record.seal_encrypted) {
      if (!record.sui_object_id || !record.conversation_hash) {
        showStatus('这条记录缺少 Seal 解密所需的链上对象 ID 或对话哈希，请重新存证生成新记录。', 'error');
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
      showStatus('已打开钱包解密页面，请连接拥有该记录的钱包', 'success');
      return;
    }

    setDownloadingBlobId(record.walrus_blob_id);
    try {
      const bytes = await downloadFromWalrus(record.walrus_blob_id);
      downloadWalrusBlob(record.walrus_blob_id, bytes);
      showStatus('Walrus 原文件已开始下载', 'success');
    } catch (error) {
      console.error('[Popup] Download Walrus blob error:', error);
      showStatus(error instanceof Error ? error.message : '下载 Walrus 文件失败', 'error');
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
      <div className="w-full min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full min-h-screen bg-gray-50 p-4">
        <div className="text-center">
          <div className="text-3xl mb-2">🦭</div>
          <h1 className="text-xl font-bold text-gray-800 mb-1">Sui-Seal</h1>
          <p className="text-sm text-gray-500 mb-6">AI 对话永久存证</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={signInWithGoogle}
            className="w-full py-3 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            使用 Google 账号登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name || user.email}
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
              {(user.name || user.email).charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="font-medium text-gray-800 text-sm">
              {user.name || '用户'}
            </div>
            <div className="text-xs text-gray-500">{user.email}</div>
          </div>
        </div>
        <button
          onClick={signOut}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          退出
        </button>
      </div>

      {statusMessage && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          statusMessage.type === 'error'
            ? 'bg-red-50 text-red-700 border border-red-200'
            : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {statusMessage.text}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <div className="text-sm text-blue-800 font-medium mb-1">🦭 Sui-Seal</div>
        <div className="text-xs text-blue-600">
          {currentPlatform
            ? `已检测到: ${currentPlatform}`
            : '请在 AI 对话页面使用此插件'}
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
          对话操作
        </div>

        <button
          onClick={extractConversation}
          disabled={isExtracting || !currentPlatform}
          className="w-full py-2.5 px-4 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <span>{isExtracting ? '⏳' : '📥'}</span>
          {isExtracting ? '提取中...' : '提取当前对话'}
        </button>

        {conversation && (
          <>
            <button
              onClick={exportToMarkdown}
              className="w-full py-2.5 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <span>📄</span>
              导出 Markdown
            </button>

            <div className="bg-gray-100 rounded-lg p-3">
              <div className="text-xs font-medium text-gray-500 mb-2">已提取对话</div>
              <div className="text-sm text-gray-700 truncate">{conversation.title}</div>
              <div className="text-xs text-gray-500">{conversation.messages.length} 条消息</div>
            </div>
          </>
        )}

        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 mt-5">
          钱包操作
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
          钱包连接将在普通 HTTP 签名页中完成，以便 Sui Wallet / Slush 能正常注入。
        </div>

        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 mt-5">
          区块链存证
        </div>
        <button
          onClick={witnessToChain}
          disabled={!conversation || isWitnessing}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <span>{isWitnessing ? '⏳' : '🔐'}</span>
          {isWitnessing ? '存证准备中...' : '打开钱包签名页'}
        </button>

        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 mt-5">
          存证记录
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-800">最近记录</div>
            <button
              onClick={() => loadWitnessRecords(recordsPage)}
              disabled={isLoadingRecords}
              className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              {isLoadingRecords ? '加载中...' : '刷新'}
            </button>
          </div>

          {records.length === 0 ? (
            <div className="text-xs text-gray-500 py-2">
              {isLoadingRecords ? '正在加载存证记录...' : '暂无存证记录'}
            </div>
          ) : (
            <div className="space-y-2">
              {records.map((record) => (
                <div key={record.id} className="bg-gray-50 border border-gray-100 rounded-lg p-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-gray-800 truncate">
                        {record.conversation_title || record.platform}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {new Date(record.created_at).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => downloadRecordBlob(record)}
                      disabled={downloadingBlobId === record.walrus_blob_id}
                      className="shrink-0 text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
                    >
                      {downloadingBlobId === record.walrus_blob_id ? '下载中...' : record.seal_encrypted ? '解密 Markdown' : '下载原文件'}
                    </button>
                  </div>

                  <div className="mt-2 space-y-1 text-[11px] text-gray-600">
                    <div>
                      <span className="font-medium">Walrus:</span>
                      <span className="font-mono ml-1 break-all">{record.walrus_blob_id}</span>
                    </div>
                    <div>
                      <span className="font-medium">交易:</span>
                      <span className="font-mono ml-1 break-all">{record.sui_transaction_digest}</span>
                    </div>
                    {record.sui_object_id && (
                      <div>
                        <span className="font-medium">对象:</span>
                        <span className="font-mono ml-1 break-all">{record.sui_object_id}</span>
                      </div>
                    )}
                    {record.walrus_storage_start_at && (
                      <div>
                        <span className="font-medium">存储开始:</span>
                        <span className="ml-1">{new Date(record.walrus_storage_start_at).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => loadWitnessRecords(recordsPage - 1)}
              disabled={recordsPage === 0 || isLoadingRecords}
              className="text-xs text-gray-600 hover:text-gray-800 disabled:opacity-40"
            >
              上一页
            </button>
            <div className="text-xs text-gray-500">
              第 {recordsPage + 1} 页 / 共 {Math.max(1, Math.ceil(recordsTotal / RECORDS_PAGE_SIZE))} 页
            </div>
            <button
              onClick={() => loadWitnessRecords(recordsPage + 1)}
              disabled={(recordsPage + 1) * RECORDS_PAGE_SIZE >= recordsTotal || isLoadingRecords}
              className="text-xs text-gray-600 hover:text-gray-800 disabled:opacity-40"
            >
              下一页
            </button>
          </div>
        </div>

        {witnessResult && (
          <div className={`rounded-lg p-3 mt-3 ${
            witnessResult.success
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className={`text-sm font-medium mb-2 ${
              witnessResult.success ? 'text-green-800' : 'text-red-800'
            }`}>
              {witnessResult.success ? '存证成功！' : '存证失败'}
            </div>
            {witnessResult.success && witnessResult.suiTransactionDigest && (
              <div className="space-y-1">
                <div className="text-xs text-green-700">
                  <span className="font-medium">交易:</span>
                  <a
                    href={`https://suiscan.xyz/testnet/tx/${witnessResult.suiTransactionDigest}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-green-600 underline ml-1"
                  >
                    {witnessResult.suiTransactionDigest.substring(0, 16)}...
                  </a>
                </div>
                {witnessResult.walrusBlobId && (
                  <div className="text-xs text-green-700">
                    <span className="font-medium">Walrus:</span>
                    <span className="font-mono ml-1">{witnessResult.walrusBlobId.substring(0, 16)}...</span>
                  </div>
                )}
                {witnessResult.conversationHash && (
                  <div className="text-xs text-green-700">
                    <span className="font-medium">哈希:</span>
                    <span className="font-mono ml-1">{witnessResult.conversationHash.substring(0, 16)}...</span>
                  </div>
                )}
              </div>
            )}
            {!witnessResult.success && witnessResult.error && (
              <div className="text-xs text-red-700">{witnessResult.error}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
