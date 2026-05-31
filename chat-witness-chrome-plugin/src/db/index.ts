
import { supabase } from '../lib/supabase';
import type { DatabaseUser, WitnessRecord, UserActivity, ActivityType } from './types';

// ============================================
// User Operations
// ============================================

export async function getUser(): Promise<DatabaseUser | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .single();

  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }
  return data;
}

export async function updateLastLogin(): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', (await supabase.auth.getUser())?.data.user?.id);

  if (error) {
    console.error('Error updating last login:', error);
  }
}

// ============================================
// Witness Record Operations
// ============================================

export async function createWitnessRecord(record: Omit<WitnessRecord, 'id' | 'created_at'>): Promise<WitnessRecord | null> {
  const { data, error } = await supabase
    .from('witness_records')
    .insert(record)
    .select()
    .single();

  if (error) {
    console.error('Error creating witness record:', error);
    return null;
  }
  return data;
}

export async function updateWitnessTransactionDigest(
  id: string,
  userId: string,
  transactionDigest: string,
  walrusBlobId: string,
  metadata?: Pick<WitnessRecord, 'sui_object_id' | 'conversation_hash' | 'walrus_storage_start_at' | 'walrus_storage_epochs' | 'seal_encrypted'>,
): Promise<WitnessRecord | null> {
  const { data, error } = await supabase
    .from('witness_records')
    .update({
      sui_transaction_digest: transactionDigest,
      walrus_blob_id: walrusBlobId,
      ...metadata,
    })
    .eq('id', id)
    .eq('user_id', userId)
    .like('sui_transaction_digest', 'pending_%')
    .select()
    .single();

  if (error) {
    console.error('Error updating witness record:', error);
    return null;
  }
  return data;
}

export type WitnessRecordsPage = {
  records: WitnessRecord[];
  total: number;
};

export async function getWitnessRecords(page = 0, pageSize = 5): Promise<WitnessRecordsPage> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('witness_records')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('Error fetching witness records:', error);
    return { records: [], total: 0 };
  }
  return { records: data || [], total: count || 0 };
}

// ============================================
// User Activity Operations
// ============================================

export async function trackActivity(
  activityType: ActivityType,
  platform?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase
      .from('user_activity')
      .upsert({
        activity_date: today,
        activity_type: activityType,
        platform,
        metadata,
      }, {
        onConflict: 'user_id, activity_date, activity_type'
      });

    if (error) {
      console.warn('Error tracking activity (non-critical):', error);
    }
  } catch (e) {
    console.warn('Failed to track activity (non-critical):', e);
  }
}

export async function getUserActivity(): Promise<UserActivity[]> {
  const { data, error } = await supabase
    .from('user_activity')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user activity:', error);
    return [];
  }
  return data;
}

