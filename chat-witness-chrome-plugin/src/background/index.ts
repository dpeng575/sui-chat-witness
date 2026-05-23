import { finalizeWitness } from '../lib/witness';

const SIGNER_URL = import.meta.env.VITE_SIGNER_URL || 'http://localhost:5173/signer.html';
const SIGNER_ORIGIN = new URL(SIGNER_URL).origin;

type ExternalWitnessMessage = {
  type?: string;
  requestId?: string;
  witnessRecordId?: string;
  digest?: string;
  walrusBlobId?: string;
  conversationHash?: string;
  platform?: string;
  error?: string;
};

console.log('Sui-Seal background script loaded');

chrome.runtime.onMessage.addListener((message: unknown, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
  console.log('Background received message:', message, 'from:', sender.tab?.id);
  sendResponse({ received: true });
  return true;
});

chrome.runtime.onMessageExternal.addListener((message: ExternalWitnessMessage, sender, sendResponse) => {
  const senderOrigin = sender.url ? new URL(sender.url).origin : null;
  if (senderOrigin !== SIGNER_ORIGIN) {
    sendResponse({ success: false, error: 'Unauthorized sender' });
    return false;
  }

  if (message.type === 'SUI_SEAL_WITNESS_SIGNED') {
    if (!message.witnessRecordId || !message.digest || !message.walrusBlobId || !message.conversationHash || !message.platform) {
      sendResponse({ success: false, error: 'Invalid witness result' });
      return false;
    }

    finalizeWitness(
      message.witnessRecordId,
      message.digest,
      message.walrusBlobId,
      message.conversationHash,
      message.platform,
    ).then((result) => {
      sendResponse(result);
    }).catch((error) => {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to finalize witness',
      });
    });

    return true;
  }

  if (message.type === 'SUI_SEAL_WITNESS_FAILED') {
    console.warn('Witness signing failed:', message.error);
    sendResponse({ success: true });
    return false;
  }

  sendResponse({ success: false, error: 'Unknown external message' });
  return false;
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('Sui-Seal extension installed');
});
