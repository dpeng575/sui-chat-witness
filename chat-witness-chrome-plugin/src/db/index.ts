
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

export async function getWitnessRecords(limit = 10): Promise<WitnessRecord[]> {
  const { data, error } = await supabase
    .from('witness_records')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching witness records:', error);
    return [];
  }
  return data;
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

