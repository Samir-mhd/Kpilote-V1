-- Suivi d'utilisation des outils (comparateur mobile, impressions, calculatrice box) : une ligne par usage.
create table if not exists outils_usage (
    id uuid primary key default gen_random_uuid(),
    conseiller_id uuid not null,
    outil text not null,      -- 'telephones' | 'box'
    action text not null,     -- 'ouverture' | 'impression'
    created_at timestamptz not null default now()
);
create index if not exists outils_usage_date_idx on outils_usage (created_at desc);

-- Indispensable : l'appli utilise la clé publique (sinon les écritures sont refusées).
alter table outils_usage disable row level security;
