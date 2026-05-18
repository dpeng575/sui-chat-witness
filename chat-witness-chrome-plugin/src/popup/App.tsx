
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { conversationToMarkdown, downloadMarkdown, generateFilename } from '../utils/export';
import type { Conversation } from '../adapters/interface';

function App() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const [currentPlatform, setCurrentPlatform] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    detectCurrentPlatform();
  }, []);

  async function detectCurrentPlatform() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'detectPlatform' });
      if (response?.success) {
        setCurrentPlatform(response.platform);
      }
    } catch (e) {
      console.log('Could not detect platform:', e);
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
        console.log('[Popup] Conversation messages:', response.conversation.messages);
        response.conversation.messages.forEach((msg: any, idx: number) => {
          console.log(`[Popup] Msg ${idx}: hasImage=${msg.content.includes('![')}`, msg.content.substring(0, 200));
        });
        setConversation(response.conversation);
        showStatus('Conversation extracted successfully!', 'success');
      } else {
        showStatus(response?.error || 'Could not extract conversation', 'error');
      }
    } catch (e) {
      console.log('[Popup] Error:', e);
      showStatus('Could not connect to page. Please refresh the page and try again.', 'error');
    } finally {
      setIsExtracting(false);
    }
  }

  async function exportToMarkdown() {
    if (!conversation) {
      showStatus('No conversation to export', 'error');
      return;
    }

    console.log('[Popup] Exporting conversation:', conversation);
    const markdown = conversationToMarkdown(conversation);
    console.log('[Popup] Generated markdown:', markdown);
    const filename = generateFilename(conversation);
    downloadMarkdown(markdown, filename);
    showStatus('Conversation exported successfully!', 'success');
  }

  function showStatus(text: string, type: 'success' | 'error' = 'success') {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3000);
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
          区块链存证
        </div>
        <button
          disabled={!conversation}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <span>🔐</span>
          存证到 Sui 链（Coming Soon）
        </button>
      </div>
    </div>
  );
}

export default App;
