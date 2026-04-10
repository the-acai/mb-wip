-- Tighten upload limits: 10MB max, drop PDF/MP4/MOV, add SVG
update storage.buckets
set
  file_size_limit = 10485760, -- 10MB
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'video/webm'
  ]
where id = 'experiment-assets';
