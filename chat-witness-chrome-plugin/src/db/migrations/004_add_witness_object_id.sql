ALTER TABLE public.witness_records
  ADD COLUMN IF NOT EXISTS sui_object_id TEXT,
  ADD COLUMN IF NOT EXISTS conversation_hash TEXT;
