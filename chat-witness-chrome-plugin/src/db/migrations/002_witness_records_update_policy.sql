-- Allow users to update their own witness records after wallet signing.
CREATE POLICY IF NOT EXISTS "Users can update their own witness records" ON witness_records
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
