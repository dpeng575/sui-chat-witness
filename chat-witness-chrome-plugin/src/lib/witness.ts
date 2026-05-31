import { supabase } from './supabase';
import { hashConversation, hashToHex } from './crypto';
import { uploadToWalrus } from './walrus';
import { createWitnessRecord, trackActivity, updateWitnessTransactionDigest } from '../db';
import type { Message } from '../adapters/interface';

const CLIENT_VERSION = '0.1.0';

export interface WitnessResult {
  success: boolean;
  witnessRecordId?: string;
  suiTransactionDigest?: string;
  suiObjectId?: string;
  walrusBlobId?: string;
  conversationHash?: string;
  walrusStorageStartAt?: string;
  walrusStorageEpochs?: number;
  sealEncrypted?: boolean;
  error?: string;
}

// 这个函数准备存证数据，交易签名由 popup 中的 dapp-kit 完成
export async function prepareWitness(
  messages: Message[],
  platform: string,
  conversationTitle?: string,
  conversationUrl?: string,
): Promise<WitnessResult> {
  try {
    // 1. 获取当前用户
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not logged in' };
    }

    // 2. 计算对话哈希
    const conversationHash = hashConversation(messages);
    const conversationHashHex = hashToHex(conversationHash);
    console.log('Conversation hash:', conversationHashHex);

    // 3. 准备上传到 Walrus 的数据
    const walrusData = JSON.stringify({
      messages,
      platform,
      title: conversationTitle,
      url: conversationUrl,
      timestamp: new Date().toISOString(),
      version: CLIENT_VERSION,
    });

    // 4. 上传到 Walrus
    console.log('Uploading to Walrus...');
    const walrusBlobId = await uploadToWalrus(walrusData);
    console.log('Walrus blob ID:', walrusBlobId);

    // 5. 保存一条预处理记录到 Supabase
    console.log('Saving witness record...');
    const witnessRecord = await createWitnessRecord({
      user_id: user.id,
      sui_transaction_digest: 'pending_' + Date.now(),
      walrus_blob_id: walrusBlobId,
      platform,
      conversation_title: conversationTitle,
      conversation_url: conversationUrl,
      message_count: messages.length,
      witness_timestamp: new Date().toISOString(),
      client_version: CLIENT_VERSION,
      is_public: false,
    });

    if (!witnessRecord) {
      return { success: false, error: 'Failed to save witness record' };
    }

    // 7. 跟踪用户活动
    trackActivity('witness', platform, {
      walrusBlobId,
      messageCount: messages.length,
      pending: true,
    }).catch(e => console.warn('Activity tracking failed:', e));

    return {
      success: true,
      witnessRecordId: witnessRecord.id,
      walrusBlobId,
      conversationHash: conversationHashHex,
    };
  } catch (error) {
    console.error('Witness preparation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// 这个函数用于完成存证（钱包页面调用后更新记录）
export async function finalizeWitness(
  witnessRecordId: string,
  transactionDigest: string,
  walrusBlobId: string,
  conversationHash: string,
  platform: string,
  suiObjectId?: string,
  walrusStorageStartAt?: string,
  walrusStorageEpochs?: number,
  sealEncrypted?: boolean,
): Promise<WitnessResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not logged in' };
    }

    const witnessRecord = await updateWitnessTransactionDigest(
      witnessRecordId,
      user.id,
      transactionDigest,
      walrusBlobId,
      {
        sui_object_id: suiObjectId,
        conversation_hash: conversationHash,
        walrus_storage_start_at: walrusStorageStartAt,
        walrus_storage_epochs: walrusStorageEpochs,
        seal_encrypted: sealEncrypted,
      },
    );

    if (!witnessRecord) {
      return { success: false, error: 'Failed to update witness record' };
    }

    trackActivity('witness', platform, {
      transactionDigest,
      walrusBlobId,
    }).catch(e => console.warn('Activity tracking failed:', e));

    return {
      success: true,
      witnessRecordId,
      suiTransactionDigest: transactionDigest,
      suiObjectId,
      walrusBlobId,
      conversationHash,
      walrusStorageStartAt,
      walrusStorageEpochs,
      sealEncrypted,
    };
  } catch (error) {
    console.error('Finalize witness failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
