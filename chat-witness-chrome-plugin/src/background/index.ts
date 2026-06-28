import { supabase } from '../lib/supabase';

const SIGNER_URL = import.meta.env.VITE_SIGNER_URL || 'http://localhost:3000/en/signer';
const SIGNER_ORIGIN = new URL(SIGNER_URL).origin;

type ExternalWitnessMessage = {
  type?: string;
  requestId?: string;
  witnessRecordId?: string;
  digest?: string;
  walrusBlobId?: string;
  conversationHash?: string;
  platform?: string;
  suiObjectId?: string;
  walrusStorageStartAt?: string;
  walrusStorageEpochs?: number;
  sealEncrypted?: boolean;
  error?: string;
};

console.log('Sui-Seal background script loaded');

chrome.runtime.onInstalled.addListener(() => {
  console.log('Sui-Seal extension installed');
});

chrome.runtime.onMessage.addListener((message: unknown, _sender: chrome.runtime.MessageSender, sendResponse: (response: { received: boolean }) => void) => {
  console.log('Background received message:', message);
  sendResponse({ received: true });
});

chrome.runtime.onMessageExternal.addListener((message: ExternalWitnessMessage, sender, sendResponse) => {
  const senderOrigin = sender.url ? new URL(sender.url).origin : null;

  if (senderOrigin !== SIGNER_ORIGIN) {
    sendResponse({ success: false, error: 'Unauthorized sender' });
    return false;
  }

  if (message.type === 'SUI_SEAL_WITNESS_SIGNED') {
    finalizeWitness(message)
      .then(() => sendResponse({ success: true }))
      .catch((error) => {
        console.error('Failed to finalize witness:', error);
        sendResponse({ success: false, error: error instanceof Error ? error.message : 'Failed to finalize witness' });
      });
    return true;
  }

  if (message.type === 'SUI_SEAL_WITNESS_FAILED') {
    console.error('Witness signer failed:', message.error || 'Unknown signer error');
    sendResponse({ success: true });
    return false;
  }

  sendResponse({ success: false, error: 'Unsupported message type' });
  return false;
});

async function finalizeWitness(message: ExternalWitnessMessage) {
  if (!message.witnessRecordId || !message.digest || !message.walrusBlobId || !message.conversationHash || !message.suiObjectId) {
    throw new Error('Signer result is missing required witness data');
  }

  const { error } = await supabase
    .from('witness_records')
    .update({
      sui_transaction_digest: message.digest,
      walrus_blob_id: message.walrusBlobId,
      conversation_hash: message.conversationHash,
      sui_object_id: message.suiObjectId,
      walrus_storage_start_at: message.walrusStorageStartAt,
      walrus_storage_epochs: message.walrusStorageEpochs,
      seal_encrypted: message.sealEncrypted ?? true,
      witness_timestamp: new Date().toISOString(),
    })
    .eq('id', message.witnessRecordId);

  if (error) {
    throw error;
  }
}
