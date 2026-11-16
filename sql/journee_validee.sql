-- « Valider ma journée » : date de la dernière fin de journée validée par le conseiller.
-- Page d'accueil : validée aujourd'hui → « Déconnecté(e) » avec pastille rouge.
alter table conseillers add column if not exists journee_validee_date date;
