import type { SupabaseClient } from '@supabase/supabase-js';

export interface WitnessRecord {
  id: string;
  user_id: string;
  sui_transaction_digest: string;
  sui_object_id?: string;
  conversation_hash?: string;
  walrus_blob_id: string;
  walrus_storage_start_at?: string;
  walrus_storage_epochs?: number;
  seal_encrypted?: boolean;
  platform: string;
  conversation_title?: string;
  conversation_url?: string;
  message_count?: number;
  witness_timestamp: string;
  client_version: string;
  is_public: boolean;
  created_at: string;
}

export interface WitnessRecordsPage {
  records: WitnessRecord[];
  total: number;
}

export async function getWitnessRecords(
  supabase: SupabaseClient,
  page: number = 0,
  pageSize: number = 10
): Promise<WitnessRecordsPage> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('witness_records')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    throw error;
  }

  return {
    records: (data as WitnessRecord[]) || [],
    total: count || 0,
  };
}

export function getPlatformCounts(records: WitnessRecord[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const record of records) {
    counts[record.platform] = (counts[record.platform] || 0) + 1;
  }
  return counts;
}

export function getRecordsSummary(records: WitnessRecord[]): {
  total: number;
  latestCreatedAt: string | null;
  platformCounts: Record<string, number>;
} {
  return {
    total: records.length,
    latestCreatedAt: records[0]?.created_at ?? null,
    platformCounts: getPlatformCounts(records),
  };
}

export function requiresSealDecryptFields(record: WitnessRecord): boolean {
  return Boolean(
    record.seal_encrypted &&
      record.conversation_hash &&
      record.sui_object_id &&
      record.walrus_blob_id
  );
}
