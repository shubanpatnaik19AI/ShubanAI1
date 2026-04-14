-- Create storage bucket for chat media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chat-media', 'chat-media', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']);

-- Allow anyone to upload to chat-media bucket
CREATE POLICY "Allow public uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-media');

-- Allow public read access
CREATE POLICY "Allow public read" ON storage.objects FOR SELECT USING (bucket_id = 'chat-media');