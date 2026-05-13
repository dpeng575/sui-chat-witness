console.log('Sui-Seal background script loaded');

// Service Worker 安装时
chrome.runtime.onInstalled.addListener(() => {
  console.log('Sui-Seal extension installed');
});

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((message: unknown, _sender: chrome.runtime.MessageSender, sendResponse: (response: { received: boolean }) => void) => {
  console.log('Background received message:', message);
  sendResponse({ received: true });
});
