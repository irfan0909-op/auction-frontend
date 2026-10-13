/*
# Create auction images storage bucket

1. Storage
- Create a public storage bucket called `auction-images` for storing auction listing photos
- Set the bucket to public so images are viewable by anyone

2. Security (RLS on storage.objects)
- Allow authenticated users to upload images to the auction-images bucket
- Allow anyone to read/view images (public bucket)
- Allow users to delete their own uploaded images
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('auction-images', 'auction-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to auction-images
DROP POLICY IF EXISTS "Authenticated users can upload auction images" ON storage.objects;
CREATE POLICY "Authenticated users can upload auction images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'auction-images');

-- Allow anyone to read auction images (public bucket)
DROP POLICY IF EXISTS "Anyone can read auction images" ON storage.objects;
CREATE POLICY "Anyone can read auction images"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'auction-images');

-- Allow users to delete their own uploads
DROP POLICY IF EXISTS "Users can delete own auction images" ON storage.objects;
CREATE POLICY "Users can delete own auction images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'auction-images' AND owner = auth.uid());

-- Allow users to update their own uploads
DROP POLICY IF EXISTS "Users can update own auction images" ON storage.objects;
CREATE POLICY "Users can update own auction images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'auction-images' AND owner = auth.uid())
WITH CHECK (bucket_id = 'auction-images' AND owner = auth.uid());