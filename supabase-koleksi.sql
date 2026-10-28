-- =====================================================================
-- MAJELIS MUDZAKAROH — TAMBAHAN: Koleksiku (materi pribadi peserta)
-- Jalankan SEKALI di Supabase → SQL Editor → New query → tempel → Run.
-- (supabase.sql yang pertama tetap dipakai; berkas ini hanya menambah.)
-- =====================================================================

-- 1) Materi pribadi tiap peserta (hanya bisa dilihat pemiliknya)
create table if not exists public.materi_pribadi (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  judul text not null default '(tanpa judul)',
  kategori text not null default 'Lainnya',
  jenis text not null check (jenis in ('teks','pdf','audio','youtube')),
  teks text,
  sumber_url text,
  sumber_path text,
  mime text,
  ukuran bigint,
  ringkasan text,
  kartu jsonb not null default '[]'::jsonb,
  soal jsonb not null default '[]'::jsonb,
  status text not null default 'manual',
  galat text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists materi_pribadi_user_idx on public.materi_pribadi (user_id, created_at desc);
alter table public.materi_pribadi enable row level security;
drop policy if exists "pribadi lihat sendiri" on public.materi_pribadi;
create policy "pribadi lihat sendiri" on public.materi_pribadi for select using (user_id = auth.uid());
drop policy if exists "pribadi tambah sendiri" on public.materi_pribadi;
create policy "pribadi tambah sendiri" on public.materi_pribadi for insert with check (user_id = auth.uid());
drop policy if exists "pribadi ubah sendiri" on public.materi_pribadi;
create policy "pribadi ubah sendiri" on public.materi_pribadi for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "pribadi hapus sendiri" on public.materi_pribadi;
create policy "pribadi hapus sendiri" on public.materi_pribadi for delete using (user_id = auth.uid());

-- 2) Catatan pemakaian AI (untuk batas harian)
create table if not exists public.ai_pakai (
  id bigserial primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  jenis text,
  created_at timestamptz default now()
);
alter table public.ai_pakai enable row level security;
drop policy if exists "ai catat sendiri" on public.ai_pakai;
create policy "ai catat sendiri" on public.ai_pakai for insert with check (user_id = auth.uid());
drop policy if exists "ai lihat sendiri" on public.ai_pakai;
create policy "ai lihat sendiri" on public.ai_pakai for select using (user_id = auth.uid() or public.is_admin());

-- 3) Penyimpanan berkas pribadi (PDF, audio) — tertutup, tiap peserta di foldernya sendiri
insert into storage.buckets (id, name, public)
values ('pribadi', 'pribadi', false) on conflict (id) do nothing;
drop policy if exists "pribadi baca sendiri" on storage.objects;
create policy "pribadi baca sendiri" on storage.objects for select
  using (bucket_id = 'pribadi' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "pribadi unggah sendiri" on storage.objects;
create policy "pribadi unggah sendiri" on storage.objects for insert
  with check (bucket_id = 'pribadi' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "pribadi ubah berkas sendiri" on storage.objects;
create policy "pribadi ubah berkas sendiri" on storage.objects for update
  using (bucket_id = 'pribadi' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "pribadi hapus berkas sendiri" on storage.objects;
create policy "pribadi hapus berkas sendiri" on storage.objects for delete
  using (bucket_id = 'pribadi' and (storage.foldername(name))[1] = auth.uid()::text);
