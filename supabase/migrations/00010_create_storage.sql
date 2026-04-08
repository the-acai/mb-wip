-- Create private storage bucket for experiment assets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'experiment-assets',
  'experiment-assets',
  false,
  52428800, -- 50MB
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'application/pdf']
);

-- Storage RLS: authenticated users can upload to their own folder
create policy "Auth users can upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'experiment-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Auth users can read all assets (internal app)
create policy "Auth users can read assets"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'experiment-assets');

-- Users can delete their own uploads
create policy "Users delete own uploads"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'experiment-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
