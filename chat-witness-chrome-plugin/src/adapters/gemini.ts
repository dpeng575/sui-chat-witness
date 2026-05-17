
import type { Adapter, Conversation, Message } from './interface';
import { htmlToMarkdown } from '../utils/htmlToMarkdown';

// 选择器配置 - 未来类名变更只需改这里
const SELECTORS = {
  chatHistory: [
    '.chat-history.enable-2026q1-formatting-improvements',
    '.chat-history',
  ],
  userMessage: [
    '.user-query-bubble-with-background.enable-2026q1-formatting-improvements',
    '.user-query-bubble-with-background',
    '[class*="user-query"]',
  ],
  aiMessage: [
    '.markdown.markdown-main-panel.stronger.enable-updated-hr-color',
    '.markdown.markdown-main-panel',
    '[class*="markdown-main-panel"]',
    '[class*="markdown"]',
  ],
};

// 尝试多个选择器，返回找到的第一个
function querySelectorWithFallbacks(container: Element | Document, selectors: string[]): Element | null {
  for (const selector of selectors) {
    try {
      const elem = container.querySelector(selector);
      if (elem) {
        return elem;
      }
    } catch {
      continue;
    }
  }
  return null;
}

function querySelectorAllWithFallbacks(container: Element, selectors: string[]): Element[] {
  for (const selector of selectors) {
    try {
      const elems = container.querySelectorAll(selector);
      if (elems.length > 0) {
        return Array.from(elems);
      }
    } catch {
      continue;
    }
  }
  return [];
}

export class GeminiAdapter implements Adapter {
  private static readonly PLATFORM = 'gemini';

  detect(): boolean {
    return window.location.hostname.includes('gemini.google.com');
  }

  extractConversation(): Conversation | null {
    const chatHistory = querySelectorWithFallbacks(document, SELECTORS.chatHistory);
    if (!chatHistory) {
      return null;
    }

    const messages: Message[] = [];

    const userMessages = querySelectorAllWithFallbacks(chatHistory, SELECTORS.userMessage);
    const aiMessages = querySelectorAllWithFallbacks(chatHistory, SELECTORS.aiMessage);

    // 收集所有消息并排序
    const allMessageElements: { elem: Element; isUser: boolean }[] = [];
    userMessages.forEach(elem => allMessageElements.push({ elem, isUser: true }));
    aiMessages.forEach(elem => allMessageElements.push({ elem, isUser: false }));

    // 按 DOM 位置排序
    allMessageElements.sort((a, b) => {
      const position = a.elem.compareDocumentPosition(b.elem);
      if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });

    allMessageElements.forEach(({ elem, isUser }) => {
      const content = isUser
        ? elem.textContent?.trim() || ''
        : htmlToMarkdown(elem).trim();

      if (content) {
        messages.push({
          role: isUser ? 'user' : 'assistant',
          content,
          timestamp: Date.now(),
        });
      }
    });

    if (messages.length === 0) {
      return null;
    }

    const title = document.querySelector('title')?.textContent?.replace(' - Gemini', '').trim() || 'Gemini Conversation';

    return {
      id: this.getConversationId(),
      platform: GeminiAdapter.PLATFORM,
      title,
      url: window.location.href,
      messages,
    };
  }

  observeNewTokens(callback: (token: string) => void): () => void {
    const chatHistory = querySelectorWithFallbacks(document, SELECTORS.chatHistory) || document.body;

    let lastContent = '';

    const observer = new MutationObserver(() => {
      const aiMessages = querySelectorAllWithFallbacks(chatHistory, SELECTORS.aiMessage);
      const lastAiMessage = aiMessages[aiMessages.length - 1];
      if (lastAiMessage) {
        const currentContent = lastAiMessage.textContent || '';
        if (currentContent.length > lastContent.length) {
          const newTokens = currentContent.slice(lastContent.length);
          callback(newTokens);
        }
        lastContent = currentContent;
      }
    });

    observer.observe(chatHistory, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }

  private getConversationId(): string {
    const urlMatch = window.location.pathname.match(/\/chat\/([a-zA-Z0-9_-]+)/);
    if (urlMatch) {
      return urlMatch[1];
    }
    return `gemini_${Date.now()}`;
  }
}

