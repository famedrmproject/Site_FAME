-- Demandes de compte en libre-service, validées par un administrateur.
-- L'utilisateur Supabase Auth est créé à la demande (id = auth.users.id), mais
-- aucune ligne `members` n'existe avant validation : l'accès membre (site,
-- observatoire via is_active_member) reste fermé tant que la demande est en attente.
create table signup_requests (
  id         uuid primary key,
  email      text not null unique,
  prenom     text not null,
  nom        text not null,
  role       text not null check (role in ('direction','researcher','phd','engineering')),
  labo       text not null check (labo in ('paris','montreal')),
  message    text check (char_length(message) <= 1000),
  created_at timestamptz not null default now()
);

-- Lu et écrit uniquement par les routes serveur (clé service) : aucune policy.
alter table signup_requests enable row level security;
