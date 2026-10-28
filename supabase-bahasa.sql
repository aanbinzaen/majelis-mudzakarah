-- MAJELIS MUDZAKAROH — tambahan kolom pilihan bahasa untuk Koleksiku
-- Jalankan sekali: Supabase → SQL Editor → New query → tempel → Run
alter table public.materi_pribadi add column if not exists bahasa text not null default 'otomatis';
