console.log('Sui-Seal content script loaded on:', window.location.href);

// 检测当前页面是哪个平台
function detectPlatform(): string | null {
  const hostname = window.location.hostname;
  if (hostname.includes('chat.openai.com')) return 'ChatGPT';
  if (hostname.includes('claude.ai')) return 'Claude';
  if (hostname.includes('gemini.google.com')) return 'Gemini';
  if (hostname.includes('kimi.moonshot.cn')) return 'Kimi';
  return null;
}

const platform = detectPlatform();
if (platform) {
  console.log(`Detected platform: ${platform}`);
  // TODO: 注入按钮到页面
}
