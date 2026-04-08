-- Add image dimension columns to assets for orientation classification
alter table public.assets add column width int;
alter table public.assets add column height int;
