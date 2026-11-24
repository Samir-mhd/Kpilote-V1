/**
 * Quiz : enregistrement des réponses (table quiz_reponses, sql/quiz.sql) et calcul de la progression.
 * Si la table n'existe pas encore, les réponses sont gardées sur l'appareil (localStorage) pour que
 * le quiz reste utilisable ; le classement d'équipe a alors besoin de la table.
 */
import { supabase } from "@/lib/supabase";
import { QUESTIONS, NIVEAUX_QUIZ, type ThemeQuiz, type NiveauQuiz } from "@/data/quizQuestions";
import { periodeSemaineEffective } from "@/utils/periodes";

export type ReponseQuiz = { question_id: string; theme: string; niveau: number; correct: boolean; points: number; du_jour: boolean; created_at: string };

const cleLocale = (id: string) => `kpilote-quiz-${id}`;
function lireLocal(id: string): ReponseQuiz[] {
    try { return JSON.parse(localStorage.getItem(cleLocale(id)) ?? "[]"); } catch { return []; }
}
function ecrireLocal(id: string, r: ReponseQuiz[]) {
    try { localStorage.setItem(cleLocale(id), JSON.stringify(r.slice(-2000))); } catch { /* stockage indisponible */ }
}

/** Toutes les réponses du conseiller (base + appareil, dédoublonnées). */
export async function getReponsesQuiz(conseillerId: string): Promise<ReponseQuiz[]> {
    const locales = lireLocal(conseillerId);
    const { data, error } = await supabase
        .from("quiz_reponses")
        .select("question_id, theme, niveau, correct, points, du_jour, created_at")
        .eq("conseiller_id", conseillerId)
        .order("created_at", { ascending: true })
        .limit(5000);
    if (error || !data) return locales;
    const vues = new Set(data.map((r) => `${r.question_id}|${r.created_at}`));
    return [...data, ...locales.filter((r) => !vues.has(`${r.question_id}|${r.created_at}`))];
}

/** Enregistre une réponse. Retourne false si elle n'a pu être gardée que sur l'appareil. */
export async function enregistrerReponseQuiz(conseillerId: string, r: Omit<ReponseQuiz, "created_at">): Promise<{ ligne: ReponseQuiz; enBase: boolean }> {
    const ligne: ReponseQuiz = { ...r, created_at: new Date().toISOString() };
    const { error } = await supabase.from("quiz_reponses").insert({ conseiller_id: conseillerId, ...ligne });
    if (error) ecrireLocal(conseillerId, [...lireLocal(conseillerId), ligne]);
    return { ligne, enBase: !error };
}

/** Points de la semaine en cours, par conseiller (table uniquement). */
export async function getClassementQuizSemaine(): Promise<{ id: string; nom: string; points: number }[]> {
    const { debut } = periodeSemaineEffective(new Date());
    const [{ data: rep, error }, { data: cons }] = await Promise.all([
        supabase.from("quiz_reponses").select("conseiller_id, points").gte("created_at", debut.toISOString()),
        supabase.from("conseillers").select("id, nom"),
    ]);
    if (error || !rep) return [];
    const pts: Record<string, number> = {};
    rep.forEach((r: { conseiller_id: string; points: number }) => { pts[r.conseiller_id] = (pts[r.conseiller_id] ?? 0) + (r.points ?? 0); });
    return Object.entries(pts)
        .map(([id, points]) => ({ id, points, nom: (cons ?? []).find((c: { id: string }) => c.id === id)?.nom?.split(" ")[0] ?? "—" }))
        .sort((a, b) => b.points - a.points);
}

/* ───────── Progression ───────── */

/** Questions réussies au moins une fois. */
export function questionsReussies(reps: ReponseQuiz[]): Set<string> {
    return new Set(reps.filter((r) => r.correct).map((r) => r.question_id));
}

/** Questions dont la DERNIÈRE réponse est fausse (à revoir). */
export function questionsARevoir(reps: ReponseQuiz[]): string[] {
    const derniere: Record<string, boolean> = {};
    reps.filter((r) => !r.du_jour).forEach((r) => { derniere[r.question_id] = r.correct; });
    return Object.entries(derniere).filter(([, ok]) => !ok).map(([id]) => id);
}

export function questionsDe(theme: ThemeQuiz, niveau: NiveauQuiz) {
    return QUESTIONS.filter((q) => q.theme === theme && q.niveau === niveau);
}

/** Un niveau est terminé quand chacune de ses questions a été réussie au moins une fois. */
export function niveauTermine(theme: ThemeQuiz, niveau: NiveauQuiz, reussies: Set<string>): boolean {
    return questionsDe(theme, niveau).every((q) => reussies.has(q.id));
}

/** Niveau 2 débloqué après le niveau 1 ; niveau Expert après les niveaux 1 et 2. */
export function niveauDebloque(theme: ThemeQuiz, niveau: NiveauQuiz, reussies: Set<string>): boolean {
    if (niveau === 1) return true;
    if (niveau === 2) return niveauTermine(theme, 1, reussies);
    return niveauTermine(theme, 1, reussies) && niveauTermine(theme, 2, reussies);
}

/** Série de 10 : d'abord les questions jamais réussies, puis les autres, mélangées. */
export function composerSerie(theme: ThemeQuiz, niveau: NiveauQuiz, reussies: Set<string>, taille = 10) {
    const melange = <T,>(l: T[]) => l.map((x) => [Math.random(), x] as const).sort((a, b) => a[0] - b[0]).map(([, x]) => x);
    const qs = questionsDe(theme, niveau);
    const pasEncore = melange(qs.filter((q) => !reussies.has(q.id)));
    const deja = melange(qs.filter((q) => reussies.has(q.id)));
    return [...pasEncore, ...deja].slice(0, taille);
}

/** Question du jour : la même pour toute l'équipe, tirée parmi les niveaux 1 et 2. */
export function questionDuJour(date = new Date()) {
    const pool = QUESTIONS.filter((q) => q.niveau <= 2);
    const j = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
    return pool[(j * 7919) % pool.length];
}

export const pointsDe = (niveau: NiveauQuiz) => NIVEAUX_QUIZ[niveau].points;

/** Jours consécutifs (jusqu'à aujourd'hui ou hier) avec au moins une réponse. */
export function serieDeJours(reps: ReponseQuiz[]): number {
    const jours = new Set(reps.map((r) => r.created_at.slice(0, 10)));
    const d = new Date();
    const cle = (x: Date) => x.toISOString().slice(0, 10);
    if (!jours.has(cle(d))) d.setDate(d.getDate() - 1);
    let n = 0;
    while (jours.has(cle(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
}
