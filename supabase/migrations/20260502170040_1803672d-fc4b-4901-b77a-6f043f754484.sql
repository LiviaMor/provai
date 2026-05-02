
-- Private bucket for user assessment photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('assessment-photos', 'assessment-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Each user can only access their own folder: <user_id>/...
CREATE POLICY "Users can view own assessment photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'assessment-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own assessment photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'assessment-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own assessment photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'assessment-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own assessment photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'assessment-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
