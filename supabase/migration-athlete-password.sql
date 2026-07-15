-- Senha de acesso do atleta (área Meu ingresso). Rode no SQL Editor do Supabase.

alter table public.registrations
  add column if not exists access_password_hash text;
