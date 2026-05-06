-- Allow users to UPDATE and DELETE their own predictions before deadline & before match starts.
-- Existing INSERT policy already enforces can_predict(). Add UPDATE/DELETE with same guard.

CREATE POLICY "Users update own predictions before deadline"
ON public.predictions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND can_predict(match_id))
WITH CHECK (auth.uid() = user_id AND can_predict(match_id));

CREATE POLICY "Users delete own predictions before deadline"
ON public.predictions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND can_predict(match_id));

-- Ensure one prediction per user per match (prevents duplicate submissions)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'predictions_user_match_unique'
  ) THEN
    ALTER TABLE public.predictions
      ADD CONSTRAINT predictions_user_match_unique UNIQUE (user_id, match_id);
  END IF;
END$$;