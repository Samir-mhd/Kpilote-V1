-- Défi du jour (Cerebro Check) : un défi proposé chaque matin à chaque conseiller planifié.
-- statut : propose → accepte | refuse (refusé = affiché comme "priorité du jour") → reussi.
create table if not exists defis_jour (
    id uuid primary key default gen_random_uuid(),
    conseiller_id uuid not null,
    jour date not null,
    type text not null,          -- 'produit' | 'combo' | 'vente_combo'
    code text not null,          -- code produit (box, avis_google, assurance_essentielle…) ou 'vente_combo'
    libelle text not null,       -- ex. "3 box", "2 ventes combo"
    cible integer not null,
    statut text not null default 'propose',
    reussi_le timestamptz,
    created_at timestamptz not null default now(),
    unique (conseiller_id, jour)
);

-- L'app utilise la clé anon sans couche d'auth : comme les autres tables du projet.
alter table defis_jour disable row level security;
