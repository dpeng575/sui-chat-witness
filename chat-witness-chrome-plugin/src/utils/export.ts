
import type { Conversation } from '../adapters/interface';

export function conversationToMarkdown(conversation: Conversation): string {
  let markdown = '';

  // Title
  if (conversation.title) {
    markdown += `# ${conversation.title}\n\n`;
  }

  // Metadata
  markdown += `> **Platform**: ${conversation.platform}\n`;
  markdown += `> **URL**: ${conversation.url}\n`;
  markdown += `> **Exported**: ${new Date().toISOString()}\n\n`;
  markdown += `---\n\n`;

  // Messages
  for (const message of conversation.messages) {
    const role = message.role === 'user' ? '👤 User' : '🤖 Assistant';
    markdown += `## ${role}\n\n`;
    markdown += `${message.content}\n\n`;
    markdown += `---\n\n`;
  }

  return markdown;
}

export function downloadMarkdown(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateFilename(conversation: Conversation): string {
  const title = conversation.title || 'conversation';
  const safeTitle = title.replace(/[<>:"/\\|?*]+/g, '_').slice(0, 50);
  const date = new Date().toISOString().split('T')[0];
  return `${safeTitle}_${date}.md`;
}

