
import type { Adapter, Conversation, Message } from './interface';
import { htmlToMarkdown } from '../utils/htmlToMarkdown';

export class GeminiAdapter implements Adapter {
  private static readonly PLATFORM = 'gemini';

  detect(): boolean {
    return window.location.hostname.includes('gemini.google.com');
  }

  extractConversation(): Conversation | null {
    const chatHistory = document.querySelector('.chat-history.enable-2026q1-formatting-improvements');
    if (!chatHistory) {
      return null;
    }

    const messages: Message[] = [];

    // Extract message pairs (user and AI messages are usually paired)
    const allMessageElements = chatHistory.querySelectorAll(
      '.user-query-bubble-with-background.enable-2026q1-formatting-improvements, .markdown.markdown-main-panel.stronger.enable-updated-hr-color'
    );

    allMessageElements.forEach(elem => {
      const isUser = elem.classList.contains('user-query-bubble-with-background');
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

    // Get conversation title from page
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
    const chatHistory = document.querySelector('.chat-history.enable-2026q1-formatting-improvements');
    if (!chatHistory) {
      return () => {};
    }

    let lastContent = '';

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
          const aiMessages = chatHistory.querySelectorAll('.markdown.markdown-main-panel.stronger.enable-updated-hr-color');
          const lastAiMessage = aiMessages[aiMessages.length - 1];
          if (lastAiMessage) {
            const currentContent = lastAiMessage.textContent || '';
            if (currentContent.length > lastContent.length) {
              const newTokens = currentContent.slice(lastContent.length);
              callback(newTokens);
            }
            lastContent = currentContent;
          }
        }
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
    // Try to extract from URL
    const urlMatch = window.location.pathname.match(/\/chat\/([a-zA-Z0-9_-]+)/);
    if (urlMatch) {
      return urlMatch[1];
    }
    // Fallback to timestamp-based ID
    return `gemini_${Date.now()}`;
  }
}

