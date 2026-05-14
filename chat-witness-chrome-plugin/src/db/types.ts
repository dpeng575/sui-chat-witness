
export interface DatabaseUser {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
  last_login_at: string;
  subscription_plan: string;
  subscription_start_at?: string;
  subscription_end_at?: string;
  total_witnesses: number;
  last_witness_at?: string;
  preferred_platforms?: string[];
  is_active: boolean;
}

export interface WitnessRecord {
  id: string;
  user_id: string;
  sui_transaction_digest: string;
  walrus_blob_id: string;
  platform: string;
  conversation_title?: string;
  conversation_url?: string;
  message_count?: number;
  witness_timestamp: string;
  client_version: string;
  is_public: boolean;
  created_at: string;
}

export interface UserActivity {
  id: number;
  user_id: string;
  activity_date: string;
  activity_type: string;
  platform?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export type ActivityType = 'login' | 'export' | 'migrate' | 'witness';

