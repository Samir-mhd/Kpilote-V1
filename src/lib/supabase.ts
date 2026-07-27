import { createClient } from "@supabase/supabase-js";

// cache: "no-store" — certains réseaux mobiles/proxys d'entreprise mettent en cache les
// requêtes GET PostgREST (mêmes paramètres toute la journée pour un classement "mois").
// Sans ça, un conseiller peut voir un total figé malgré des ventes fraîches en base.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  {
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  }
);