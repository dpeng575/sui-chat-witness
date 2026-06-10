import { describe, expect, it } from 'vitest';
import {
  getRecordsSummary,
  getPlatformCounts,
  requiresSealDecryptFields,
  type WitnessRecord,
} from '../witness-records';

describe('witness-records', () => {
  const mockRecords: WitnessRecord[] = [
    {
      id: '1',
      user_id: 'user1',
      sui_transaction_digest: 'digest1',
      sui_object_id: 'object1',
      conversation_hash: 'hash1',
      walrus_blob_id: 'blob1',
      walrus_storage_start_at: '2024-01-01T00:00:00Z',
      walrus_storage_epochs: 100,
      seal_encrypted: true,
      platform: 'chatgpt',
      conversation_title: 'Test Chat 1',
      conversation_url: 'https://chat.openai.com/c/1',
      message_count: 10,
      witness_timestamp: '2024-01-01T00:00:00Z',
      client_version: '1.0.0',
      is_public: false,
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      user_id: 'user1',
      sui_transaction_digest: 'digest2',
      walrus_blob_id: 'blob2',
      seal_encrypted: false,
      platform: 'claude',
      created_at: '2024-01-02T00:00:00Z',
      witness_timestamp: '2024-01-02T00:00:00Z',
      client_version: '1.0.0',
      is_public: false,
    },
    {
      id: '3',
      user_id: 'user1',
      sui_transaction_digest: 'digest3',
      walrus_blob_id: 'blob3',
      platform: 'chatgpt',
      created_at: '2024-01-03T00:00:00Z',
      witness_timestamp: '2024-01-03T00:00:00Z',
      client_version: '1.0.0',
      is_public: false,
    },
  ];

  describe('getPlatformCounts', () => {
    it('should count records by platform', () => {
      const counts = getPlatformCounts(mockRecords);
      expect(counts).toEqual({
        chatgpt: 2,
        claude: 1,
      });
    });

    it('should return empty object for empty records', () => {
      expect(getPlatformCounts([])).toEqual({});
    });
  });

  describe('getRecordsSummary', () => {
    it('should return summary with total, latestCreatedAt, and platformCounts', () => {
      // The function assumes records are already ordered newest first by getWitnessRecords
      const orderedRecords = [...mockRecords].reverse();
      const summary = getRecordsSummary(orderedRecords);
      expect(summary.total).toBe(3);
      expect(summary.latestCreatedAt).toBe('2024-01-03T00:00:00Z');
      expect(summary.platformCounts).toEqual({
        chatgpt: 2,
        claude: 1,
      });
    });

    it('should handle empty records', () => {
      const summary = getRecordsSummary([]);
      expect(summary.total).toBe(0);
      expect(summary.latestCreatedAt).toBeNull();
      expect(summary.platformCounts).toEqual({});
    });
  });

  describe('requiresSealDecryptFields', () => {
    it('should return true when all required fields are present', () => {
      const record = mockRecords[0];
      expect(requiresSealDecryptFields(record)).toBe(true);
    });

    it('should return false when seal_encrypted is false', () => {
      const record = { ...mockRecords[0], seal_encrypted: false };
      expect(requiresSealDecryptFields(record)).toBe(false);
    });

    it('should return false when conversation_hash is missing', () => {
      const record = { ...mockRecords[0], conversation_hash: undefined };
      expect(requiresSealDecryptFields(record)).toBe(false);
    });

    it('should return false when sui_object_id is missing', () => {
      const record = { ...mockRecords[0], sui_object_id: undefined };
      expect(requiresSealDecryptFields(record)).toBe(false);
    });

    it('should return false when walrus_blob_id is missing', () => {
      const record = { ...mockRecords[0], walrus_blob_id: undefined };
      expect(requiresSealDecryptFields(record)).toBe(false);
    });
  });
});
