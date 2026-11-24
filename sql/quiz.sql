-- Rubrique Quiz : une ligne par réponse donnée par un conseiller.
create table if not exists quiz_reponses (
    id uuid primary key default gen_random_uuid(),
    conseiller_id uuid not null,
    question_id text not null,
    theme text not null,
    niveau int not null,
    correct boolean not null,
    points int not null default 0,
    du_jour boolean not null default false,
    created_at timestamptz not null default now()
);
create index if not exists quiz_reponses_conseiller_idx on quiz_reponses (conseiller_id, created_at desc);

-- Indispensable : l'appli utilise la clé publique (sinon les écritures sont refusées).
alter table quiz_reponses disable row level security;
