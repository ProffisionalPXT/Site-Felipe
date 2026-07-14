-- Rode no SQL Editor do Supabase (projeto do Felipe) se o schema completo já foi aplicado.
-- Adiciona taxa % de cartão (padrão 5).

alter table public.events
  add column if not exists card_fee_percent numeric not null default 5;
