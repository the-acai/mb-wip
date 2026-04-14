-- Add ThumbHash + dominant color columns for image placeholders.
-- Both nullable so existing assets keep working.

alter table public.assets add column thumb_hash text;
alter table public.assets add column dominant_color text;

-- Rebuild the RPC to pass through the two new columns.
create or replace function public.create_post_with_relations(
  p_title text,
  p_body text,
  p_visibility text,
  p_tag_names text[],
  p_assets jsonb
)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_author uuid := auth.uid();
  v_post_id uuid;
  v_tag_name text;
  v_tag_id uuid;
  v_asset jsonb;
  v_index int := 0;
begin
  if v_author is null then
    raise exception 'Not authenticated';
  end if;

  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'Title is required';
  end if;

  insert into public.posts (author_id, title, body, visibility)
  values (
    v_author,
    p_title,
    nullif(p_body, ''),
    coalesce(nullif(p_visibility, ''), 'internal')
  )
  returning id into v_post_id;

  if p_tag_names is not null then
    foreach v_tag_name in array p_tag_names loop
      v_tag_name := lower(trim(v_tag_name));
      if length(v_tag_name) = 0 then
        continue;
      end if;
      insert into public.tags (name) values (v_tag_name)
      on conflict (name) do update set name = excluded.name
      returning id into v_tag_id;
      insert into public.post_tags (post_id, tag_id) values (v_post_id, v_tag_id)
      on conflict do nothing;
    end loop;
  end if;

  if p_assets is not null then
    for v_asset in select value from jsonb_array_elements(p_assets) loop
      insert into public.assets (
        post_id, file_path, mime_type, size_bytes, width, height, display_order,
        thumb_hash, dominant_color
      ) values (
        v_post_id,
        v_asset->>'file_path',
        v_asset->>'mime_type',
        nullif(v_asset->>'size_bytes', '')::bigint,
        nullif(v_asset->>'width', '')::int,
        nullif(v_asset->>'height', '')::int,
        v_index,
        nullif(v_asset->>'thumb_hash', ''),
        nullif(v_asset->>'dominant_color', '')
      );
      v_index := v_index + 1;
    end loop;
  end if;

  return v_post_id;
end;
$$;
