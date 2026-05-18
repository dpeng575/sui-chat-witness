
import type { Adapter, Conversation, Message } from './interface';
import { htmlToMarkdown } from '../utils/htmlToMarkdown';

const SELECTORS = {
  chatHistory: [
    '#chat-history',
    '.chat-history.enable-2026q1-formatting-improvements',
    '.chat-history',
  ],
  userMessage: [
    '.user-query-bubble-with-background.enable-2026q1-formatting-improvements',
    '.user-query-bubble-with-background',
    '[class*="user-query"]',
  ],
  conversationContainer: [
    '.conversation-container',
  ],
  aiMessage: [
    '.markdown.markdown-main-panel.stronger.enable-updated-hr-color',
    '.markdown.markdown-main-panel',
    '[class*="markdown-main-panel"]',
    '[class*="markdown"]',
  ],
  previewImage: [
    '.preview-image-button',
    'button[class*="preview"]',
    'img[src*="googleusercontent"]',
  ],
};

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

function extractContentWithImages(element: Element): string {
  const parts: string[] = [];

  // 先拿文字内容
  const text = element.textContent?.trim() || '';
  if (text) {
    parts.push(text);
  }

  // 再找这个元素里的所有图片
  const imgs = element.querySelectorAll('img');
  for (const img of imgs) {
    const src = img.getAttribute('src');
    if (src && !src.includes('=s32-') && !src.includes('=s64-')) {
      console.log(`[GeminiAdapter] - Found image in element:`, src);
      const alt = img.getAttribute('alt') || '';
      parts.push(`![${alt}](${src})`);
    }
  }

  return parts.join('\n\n');
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

    const conversationContainers = querySelectorAllWithFallbacks(chatHistory, SELECTORS.conversationContainer);
    console.log('[GeminiAdapter] conversationContainers found:', conversationContainers.length);

    if (conversationContainers.length > 0) {
      conversationContainers.forEach((container, idx) => {
        console.log(`[GeminiAdapter] Conversation ${idx}:`);

        const allChildren = Array.from(container.children);

        for (const child of allChildren) {
          const tagName = child.tagName.toLowerCase();
          const childClass = child.className || '';

          // 用户消息
          if (tagName === 'user-query' || childClass.includes('user-query')) {
            const content = extractContentWithImages(child);
            if (content) {
              messages.push({
                role: 'user',
                content,
                timestamp: Date.now(),
              });
            }
          }
          // AI 回复
          else if (tagName === 'model-response' || childClass.includes('message') || childClass.includes('response')) {
            const content = extractContentWithImages(child);
            if (content) {
              messages.push({
                role: 'assistant',
                content,
                timestamp: Date.now(),
              });
            }
          }
        }
      });
    } else {
      console.log('[GeminiAdapter] Falling back to old logic');
      const userMessages = querySelectorAllWithFallbacks(chatHistory, SELECTORS.userMessage);
      const aiMessages = querySelectorAllWithFallbacks(chatHistory, SELECTORS.aiMessage);

      const allMessageElements: { elem: Element; isUser: boolean }[] = [];
      userMessages.forEach(elem => allMessageElements.push({ elem, isUser: true }));
      aiMessages.forEach(elem => allMessageElements.push({ elem, isUser: false }));

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
    }

    console.log('[GeminiAdapter] Total messages extracted:', messages.length);
    messages.forEach((msg, idx) => {
      console.log(`[GeminiAdapter] Message ${idx} (${msg.role}): hasImage=${msg.content.includes('![')}`, msg.content.substring(0, 100));
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
    return 'gemini_' + Date.now();
  }
}

