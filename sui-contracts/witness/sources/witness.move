module witness::witness {
    use std::string::{Self, String};
    use sui::event;
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    /// 存证记录 - 保存在链上的最小必要信息
    public struct WitnessRecord has key, store {
        id: UID,
        /// 对话内容的完整哈希（SHA-256 或类似算法）
        conversation_hash: vector<u8>,
        /// Walrus 存储里的 blob ID
        walrus_blob_id: String,
        /// 平台（gemini/chatgpt/claude 等）
        platform: String,
        /// 存证时间戳（毫秒）
        timestamp_ms: u64,
        /// 客户端版本
        client_version: String,
    }

    /// 创建存证记录的事件
    public struct WitnessCreated has copy, drop {
        record_id: ID,
        conversation_hash: vector<u8>,
        walrus_blob_id: String,
        platform: String,
        timestamp_ms: u64,
    }

    /// 创建一个新的存证记录，并转移给调用者
    public entry fun create_witness(
        conversation_hash: vector<u8>,
        walrus_blob_id: String,
        platform: String,
        client_version: String,
        ctx: &mut TxContext
    ) {
        let timestamp_ms = tx_context::epoch(ctx);

        let record = WitnessRecord {
            id: object::new(ctx),
            conversation_hash,
            walrus_blob_id,
            platform,
            timestamp_ms: timestamp_ms as u64,
            client_version,
        };

        // 发送事件方便索引
        event::emit(WitnessCreated {
            record_id: object::uid_to_inner(&record.id),
            conversation_hash: record.conversation_hash,
            walrus_blob_id: record.walrus_blob_id,
            platform: record.platform,
            timestamp_ms: record.timestamp_ms,
        });

        // 转移给调用者
        transfer::transfer(record, tx_context::sender(ctx));
    }

    /// 获取存证记录的信息（用于验证）
    public fun get_info(
        record: &WitnessRecord
    ): (vector<u8>, String, String, u64, String) {
        (
            record.conversation_hash,
            record.walrus_blob_id,
            record.platform,
            record.timestamp_ms,
            record.client_version
        )
    }
}
