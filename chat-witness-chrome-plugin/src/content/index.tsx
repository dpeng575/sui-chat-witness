import { getCurrentAdapter, detectPlatform } from '../adapters';

console.log('Sui-Seal content script loaded on:', window.location.href);

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  switch (request.action) {
    case 'extractConversation': {
      const adapter = getCurrentAdapter();
      if (adapter) {
        const conversation = adapter.extractConversation();
        sendResponse({ success: true, conversation });
      } else {
        sendResponse({ success: false, error: 'No adapter found for this page' });
      }
      break;
    }
    case 'detectPlatform': {
      const platform = detectPlatform();
      sendResponse({ success: true, platform });
      break;
    }
    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
  return true;
});

const platform = detectPlatform();
if (platform) {
  console.log(`Detected platform: ${platform}`);
}
