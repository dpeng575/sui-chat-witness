import { supabase } from './supabase';
import { hashConversation, hashToHex } from './crypto';
import { uploadToWalrus } from './walrus';
import { createWitnessRecord, trackActivity } from '../db';
import type { Message } from '../adapters/interface';

const CLIENT_VERSION = '0.1.0';

export interface WitnessResult {
  success: boolean;
  suiTransactionDigest?: string;
  walrusBlobId?: string;
  conversationHash?: string;
  error?: string;
}

interface WalletSigner {
  address: string;
  signAndExecuteTransaction?: (transaction: any) => Promise<{ digest: string }>;
}

/**
 * 完整的存证流程：
 * 1. 计算对话哈希
 * 2. 上传对话数据到 Walrus
 * 3. 发送交易到 Sui 链
 * 4. 保存记录到 Supabase
 */
export async function createWitness(
  messages: Message[],
  platform: string,
  wallet: WalletSigner,
  conversationTitle?: string,
  conversationUrl?: string
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

    // 5. 构建并发送 Sui 交易 (暂时使用 mock)
    // 真实的合约调用需要根据实际合约调整
    console.log('Preparing Sui transaction...');
    console.log('Wallet address:', wallet.address);
    let suiTransactionDigest: string;

    try {
      // 这里暂时只生成一个 mock 交易 ID
      // 真实实现需要根据部署的合约调整
      suiTransactionDigest = 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
      console.log('Generated transaction ID:', suiTransactionDigest);
    } catch (txError) {
      console.warn('Failed to prepare transaction:', txError);
      suiTransactionDigest = 'mock_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
    }

    // 6. 保存记录到 Supabase
    console.log('Saving to Supabase...');
    const witnessRecord = await createWitnessRecord({
      user_id: user.id,
      sui_transaction_digest: suiTransactionDigest,
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
      console.warn('Failed to save witness record to Supabase');
    }

    // 7. 跟踪用户活动 (不阻塞主流程)
    trackActivity('witness', platform, {
      transactionDigest: suiTransactionDigest,
      walrusBlobId,
      messageCount: messages.length,
    }).catch(e => console.warn('Activity tracking failed:', e));

    return {
      success: true,
      suiTransactionDigest,
      walrusBlobId,
      conversationHash: conversationHashHex,
    };
  } catch (error) {
    console.error('Witness creation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
