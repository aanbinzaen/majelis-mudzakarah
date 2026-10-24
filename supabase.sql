-- =====================================================================
-- MAJELIS MUDZAKARAH RUMAH DAKWAH MALANG — struktur database Supabase
-- Cara pakai: Supabase → SQL Editor → New query → tempel seluruh isi
-- berkas ini → ganti email pengelola di bagian paling bawah → Run.
-- =====================================================================

-- 1) Daftar pengelola (ustadz/admin) berdasarkan email login
create table if not exists public.admins (email text primary key);
alter table public.admins enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins
                 where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- 2) Konten majelis (program, pertemuan, kartu, soal, jadwal) — satu baris
create table if not exists public.konten (
  id int primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);
alter table public.konten enable row level security;
drop policy if exists "konten dibaca semua" on public.konten;
create policy "konten dibaca semua" on public.konten for select using (true);
drop policy if exists "konten ditulis pengelola" on public.konten;
create policy "konten ditulis pengelola" on public.konten for all
  using (public.is_admin()) with check (public.is_admin());

-- 3) Peserta (nama, WA, ringkasan progres)
create table if not exists public.peserta (
  id uuid primary key references auth.users on delete cascade,
  nama text not null check (length(nama) between 2 and 60),
  wa text,
  ringkasan jsonb default '{}'::jsonb,
  aktif timestamptz default now(),
  dibuat timestamptz default now()
);
alter table public.peserta enable row level security;
drop policy if exists "peserta lihat diri / pengelola lihat semua" on public.peserta;
create policy "peserta lihat diri / pengelola lihat semua" on public.peserta for select
  using (id = auth.uid() or public.is_admin());
drop policy if exists "peserta daftar diri" on public.peserta;
create policy "peserta daftar diri" on public.peserta for insert with check (id = auth.uid());
drop policy if exists "peserta ubah diri" on public.peserta;
create policy "peserta ubah diri" on public.peserta for update
  using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists "pengelola hapus peserta" on public.peserta;
create policy "pengelola hapus peserta" on public.peserta for delete using (public.is_admin());

-- Papan semangat: hanya nama + poin (nomor WA tidak ikut terbaca)
create or replace function public.papan_semangat()
returns table (id uuid, nama text, poin int, beruntun int)
language sql stable security definer set search_path = public as $$
  select id, nama,
         coalesce((ringkasan ->> 'poin')::int, 0),
         coalesce((ringkasan ->> 'beruntun')::int, 0)
  from public.peserta
  where coalesce((ringkasan ->> 'poin')::int, 0) > 0
  order by 3 desc
  limit 20;
$$;
grant execute on function public.papan_semangat() to anon, authenticated;

-- 4) Tanya ustadz
create table if not exists public.tanya (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users on delete cascade,
  nama text,
  pid text,
  mid text,
  teks text not null check (length(teks) between 3 and 2000),
  jawaban text,
  dijawab_at timestamptz,
  created_at timestamptz default now()
);
alter table public.tanya enable row level security;
drop policy if exists "tanya dibaca semua" on public.tanya;
create policy "tanya dibaca semua" on public.tanya for select using (true);
drop policy if exists "peserta bertanya" on public.tanya;
create policy "peserta bertanya" on public.tanya for insert
  with check (user_id = auth.uid() and jawaban is null);
drop policy if exists "pengelola menjawab" on public.tanya;
create policy "pengelola menjawab" on public.tanya for update
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "hapus pertanyaan" on public.tanya;
create policy "hapus pertanyaan" on public.tanya for delete
  using (public.is_admin() or (user_id = auth.uid() and jawaban is null));

-- 5) Penyimpanan berkas materi (PDF, gambar, audio)
insert into storage.buckets (id, name, public)
values ('materi', 'materi', true) on conflict (id) do nothing;
drop policy if exists "materi dibaca semua" on storage.objects;
create policy "materi dibaca semua" on storage.objects for select using (bucket_id = 'materi');
drop policy if exists "materi diunggah pengelola" on storage.objects;
create policy "materi diunggah pengelola" on storage.objects for insert
  with check (bucket_id = 'materi' and public.is_admin());
drop policy if exists "materi diubah pengelola" on storage.objects;
create policy "materi diubah pengelola" on storage.objects for update
  using (bucket_id = 'materi' and public.is_admin());
drop policy if exists "materi dihapus pengelola" on storage.objects;
create policy "materi dihapus pengelola" on storage.objects for delete
  using (bucket_id = 'materi' and public.is_admin());

-- 6) GANTI dengan email akun pengelola (boleh lebih dari satu baris)
insert into public.admins (email) values ('aan@aimmah.ac.id') on conflict do nothing;
