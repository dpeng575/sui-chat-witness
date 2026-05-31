ALTER TABLE public.witness_records
  ADD COLUMN IF NOT EXISTS walrus_storage_start_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS walrus_storage_epochs INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS seal_encrypted BOOLEAN DEFAULT false;
