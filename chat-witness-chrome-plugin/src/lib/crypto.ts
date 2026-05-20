import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

/**
 * 将对话内容标准化为一个字符串用于哈希计算
 */
export function conversationToHashString(messages: Array<{role: string, content: string}>): string {
    // 按顺序拼接每条消息：role + "|" + content + "\n"
    return messages.map(msg => `${msg.role}|${msg.content}`).join('\n');
}

/**
 * 计算对话内容的 SHA-256 哈希
 */
export function hashConversation(messages: Array<{role: string, content: string}>): Uint8Array {
    const normalized = conversationToHashString(messages);
    return sha256(normalized);
}

/**
 * 将 Uint8Array 转换为十六进制字符串（方便显示）
 */
export function hashToHex(hash: Uint8Array): string {
    return bytesToHex(hash);
}
