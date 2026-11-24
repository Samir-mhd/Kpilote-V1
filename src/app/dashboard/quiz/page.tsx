"use client";

/**
 * Rubrique Quiz : 3 thèmes (Box, Mobile, Gestion & process), 3 niveaux chacun.
 * Niveau 2 débloqué quand toutes les questions du niveau 1 ont été réussies ; Expert quand 1 et 2 le sont.
 * Questions : src/data/quizQuestions.ts · Réponses : src/services/quizService.ts.
 */
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, X, ExternalLink, Trophy, Flame, Timer, ArrowRight, RotateCcw, Lock, Zap } from "lucide-react";
import { QUESTIONS, THEMES_QUIZ, NIVEAUX_QUIZ, SOURCES_QUIZ, QUIZ_VERIFIE_LE, type QuestionQuiz, type NiveauQuiz } from "@/data/quizQuestions";
import {
    getReponsesQuiz, enregistrerReponseQuiz, getClassementQuizSemaine, questionsReussies, questionsARevoir,
    questionsDe, niveauTermine, niveauDebloque, composerSerie, questionDuJour, pointsDe, serieDeJours, type ReponseQuiz,
} from "@/services/quizService";

const ROUGE = "#cd1e25";
const melanger = <T,>(l: T[]) => l.map((x) => [Math.random(), x] as const).sort((a, b) => a[0] - b[0]).map(([, x]) => x);
const aujourdhui = () => new Date().toISOString().slice(0, 10);

type Item = { q: QuestionQuiz; choix: string[] };
type Partie = { titre: string; items: Item[]; index: number; reponses: (string | null)[]; debut: number; duJour: boolean };

const preparer = (qs: QuestionQuiz[]): Item[] => qs.map((q) => ({ q, choix: melanger([...q.r]) }));

function Quiz() {
    const sp = useSearchParams();
    const conseillerId = sp.get("id") ?? "";

    const [reps, setReps] = useState<ReponseQuiz[]>([]);
    const [classement, setClassement] = useState<{ id: string; nom: string; points: number }[]>([]);
    const [horsLigne, setHorsLigne] = useState(false);
    const [partie, setPartie] = useState<Partie | null>(null);
    const [termine, setTermine] = useState(false);
    const [maintenant, setMaintenant] = useState(() => Date.now());

    const charger = useCallback(() => {
        if (!conseillerId) return;
        getReponsesQuiz(conseillerId).then(setReps).catch(() => setReps([]));
        getClassementQuizSemaine().then(setClassement).catch(() => setClassement([]));
    }, [conseillerId]);
    useEffect(() => { charger(); }, [charger]);

    // Chrono de la série en cours.
    useEffect(() => {
        if (!partie || termine) return;
        const t = setInterval(() => setMaintenant(Date.now()), 1000);
        return () => clearInterval(t);
    }, [partie, termine]);

    const reussies = useMemo(() => questionsReussies(reps), [reps]);
    const aRevoir = useMemo(() => questionsARevoir(reps).map((id) => QUESTIONS.find((q) => q.id === id)).filter((q): q is QuestionQuiz => !!q), [reps]);
    const qJour = useMemo(() => questionDuJour(), []);
    const jourFait = reps.some((r) => r.du_jour && r.created_at.slice(0, 10) === aujourdhui());
    const serie = serieDeJours(reps);
    const rang = classement.findIndex((c) => c.id === conseillerId);

    function lancer(titre: string, qs: QuestionQuiz[], duJour = false) {
        if (qs.length === 0) return;
        setPartie({ titre, items: preparer(qs), index: 0, reponses: qs.map(() => null), debut: Date.now(), duJour });
        setTermine(false);
        setMaintenant(Date.now());
        window.scrollTo({ top: 0 });
    }

    async function repondre(choix: string) {
        if (!partie || partie.reponses[partie.index] !== null) return;
        const item = partie.items[partie.index];
        const correct = choix === item.q.r[0];
        setPartie({ ...partie, reponses: partie.reponses.map((r, i) => (i === partie.index ? choix : r)) });
        if (!conseillerId) return;
        const points = correct ? (partie.duJour ? 10 : pointsDe(item.q.niveau)) : 0;
        const { ligne, enBase } = await enregistrerReponseQuiz(conseillerId, {
            question_id: item.q.id, theme: item.q.theme, niveau: item.q.niveau, correct, points, du_jour: partie.duJour,
        });
        if (!enBase) setHorsLigne(true);
        setReps((l) => [...l, ligne]);
    }

    function suivante() {
        if (!partie) return;
        if (partie.index + 1 >= partie.items.length) { setTermine(true); charger(); return; }
        setPartie({ ...partie, index: partie.index + 1 });
        window.scrollTo({ top: 0 });
    }

    const entete = (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
                <p className="text-[11px] font-black uppercase tracking-[0.25em]" style={{ color: ROUGE }}><Link href={`/dashboard/outils?id=${encodeURIComponent(conseillerId)}&nom=${encodeURIComponent(sp.get("nom") ?? "")}`} className="hover:underline">Outils</Link> · Quiz</p>
                <h1 className="text-3xl font-black text-slate-900">Teste tes connaissances</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                {serie > 0 && <span className="flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-sm font-black text-orange-600 ring-1 ring-orange-200"><Flame size={16} /> {serie} jour{serie > 1 ? "s" : ""} de suite</span>}
                {rang >= 0 && <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-black text-slate-700 ring-1 ring-slate-200"><Trophy size={16} className="text-amber-500" /> {rang + 1}<sup>e</sup> de l&apos;équipe</span>}
            </div>
        </div>
    );

    /* ───────────── Partie en cours ───────────── */
    if (partie && !termine) {
        const item = partie.items[partie.index];
        const choisi = partie.reponses[partie.index];
        const bon = item.q.r[0];
        const ok = choisi === bon;
        const src = SOURCES_QUIZ[item.q.src];
        const theme = THEMES_QUIZ.find((t) => t.id === item.q.theme)!;
        const sec = Math.floor((maintenant - partie.debut) / 1000);
        return (
            <div className="mx-auto max-w-3xl">
                {entete}
                <div className="mb-5 flex items-center gap-3">
                    <span className={`shrink-0 rounded-full bg-gradient-to-r ${theme.grad} px-3 py-1 text-xs font-black text-white`}>{theme.emoji} {partie.duJour ? "Question du jour" : `${theme.titre} · ${NIVEAUX_QUIZ[item.q.niveau].label}`}</span>
                    <div className="h-2 flex-1 rounded-full bg-slate-200"><div className="h-full rounded-full bg-gradient-to-r from-[#cd1e25] to-rose-400 transition-all" style={{ width: `${((partie.index + (choisi ? 1 : 0)) / partie.items.length) * 100}%` }} /></div>
                    <span className="text-sm font-black tabular-nums text-slate-600">{partie.index + 1} / {partie.items.length}</span>
                    <span className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm font-black tabular-nums text-slate-700 ring-1 ring-slate-200"><Timer size={15} /> {Math.floor(sec / 60)}:{String(sec % 60).padStart(2, "0")}</span>
                </div>
                <div className="rounded-[28px] border-2 border-slate-900 bg-white p-5 sm:p-7">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Question {partie.index + 1}{item.q.niveau === 3 && " · ⚠️ attention aux pièges"}</p>
                    <p className="mt-2 text-xl font-black leading-snug text-slate-900 sm:text-2xl">{item.q.q}</p>
                    <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {item.choix.map((c, i) => {
                            const estBon = choisi !== null && c === bon;
                            const estFaux = choisi === c && c !== bon;
                            const grise = choisi !== null && !estBon && !estFaux;
                            return (
                                <button key={c} type="button" disabled={choisi !== null} onClick={() => repondre(c)}
                                    className={`flex items-center gap-3 rounded-2xl px-4 py-4 text-left text-base font-bold transition-all ${estBon ? "bg-emerald-50 text-emerald-800 ring-2 ring-emerald-400" : estFaux ? "bg-rose-50 text-rose-800 ring-2 ring-rose-400" : grise ? "bg-slate-50 text-slate-400 ring-1 ring-slate-200" : "bg-slate-50 text-slate-800 ring-1 ring-slate-200 hover:bg-white hover:ring-2 hover:ring-slate-900 active:scale-[0.99]"}`}>
                                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-black ${estBon ? "bg-emerald-500 text-white" : estFaux ? "bg-rose-500 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}>
                                        {estBon ? <Check size={16} strokeWidth={3} /> : estFaux ? <X size={16} strokeWidth={3} /> : "ABCD"[i]}
                                    </span>
                                    {c}
                                </button>
                            );
                        })}
                    </div>
                    {choisi !== null && (
                        <div className={`mt-6 rounded-2xl p-5 ring-1 ${ok ? "bg-emerald-50 ring-emerald-200" : "bg-amber-50 ring-amber-200"}`}>
                            <p className={`font-black ${ok ? "text-emerald-800" : "text-amber-900"}`}>{ok ? `✅ Bonne réponse ! +${partie.duJour ? 10 : pointsDe(item.q.niveau)} points` : "💡 Pas tout à fait !"}</p>
                            <p className={`mt-1 text-sm font-semibold leading-relaxed ${ok ? "text-emerald-900/90" : "text-amber-900/90"}`}>{item.q.expl}</p>
                            <p className="mt-2 flex items-center gap-1 text-xs font-black text-slate-500">
                                <ExternalLink size={12} />
                                Source : {src.url ? <a href={src.url} target="_blank" rel="noopener noreferrer" className="underline">{src.label}</a> : src.label} · vérifiée le {QUIZ_VERIFIE_LE}
                            </p>
                        </div>
                    )}
                </div>
                <div className="mt-5 flex items-center justify-between">
                    <button type="button" onClick={() => { setPartie(null); charger(); }} className="text-sm font-black text-slate-400 hover:text-slate-700">Quitter</button>
                    {choisi !== null && (
                        <button type="button" onClick={suivante} className="flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3.5 text-base font-black text-white hover:bg-slate-800">
                            {partie.index + 1 >= partie.items.length ? "Voir mon résultat" : "Question suivante"} <ArrowRight size={18} />
                        </button>
                    )}
                </div>
            </div>
        );
    }

    /* ───────────── Résultat ───────────── */
    if (partie && termine) {
        const bons = partie.items.filter((it, i) => partie.reponses[i] === it.q.r[0]).length;
        const points = partie.items.reduce((t, it, i) => t + (partie.reponses[i] === it.q.r[0] ? (partie.duJour ? 10 : pointsDe(it.q.niveau)) : 0), 0);
        const sec = Math.floor((maintenant - partie.debut) / 1000);
        const erreurs = partie.items.filter((it, i) => partie.reponses[i] !== it.q.r[0]);
        const theme0 = partie.items[0].q;
        const debloque = !partie.duJour && theme0 && partie.items.every((it) => it.q.theme === theme0.theme && it.q.niveau === theme0.niveau)
            && theme0.niveau < 3 && niveauTermine(theme0.theme, theme0.niveau, reussies)
            ? (theme0.niveau + 1) as NiveauQuiz : null;
        return (
            <div className="mx-auto max-w-3xl space-y-5">
                {entete}
                <div className="rounded-[28px] bg-gradient-to-br from-[#cd1e25] via-[#b3171d] to-[#7f1015] p-8 text-center text-white">
                    <p className="text-6xl">{bons === partie.items.length ? "🏆" : bons >= partie.items.length * 0.7 ? "🎉" : "💪"}</p>
                    <p className="mt-2 text-xs font-black uppercase tracking-[0.25em] text-white/75">{partie.titre} · terminé</p>
                    <p className="mt-1 text-6xl font-black tabular-nums">{bons} / {partie.items.length}</p>
                    <p className="text-lg font-bold text-white/85">+{points} points · {Math.floor(sec / 60)} min {String(sec % 60).padStart(2, "0")}</p>
                    <div className="mt-5 flex flex-wrap justify-center gap-1.5">
                        {partie.items.map((it, i) => {
                            const r = partie.reponses[i] === it.q.r[0];
                            return <span key={i} className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-black ${r ? "bg-emerald-400 text-emerald-950" : "bg-white/25 text-white"}`}>{r ? "✓" : "✗"}</span>;
                        })}
                    </div>
                </div>
                {debloque && (
                    <div className="flex items-center gap-3 rounded-[24px] border-2 border-slate-900 bg-amber-50 p-5">
                        <span className="text-3xl">🔓</span>
                        <p className="flex-1 font-black text-amber-900">Niveau « {NIVEAUX_QUIZ[debloque].label} » débloqué en {THEMES_QUIZ.find((t) => t.id === theme0.theme)!.titre} !</p>
                        <button type="button" onClick={() => lancer(`${THEMES_QUIZ.find((t) => t.id === theme0.theme)!.titre} · ${NIVEAUX_QUIZ[debloque].label}`, composerSerie(theme0.theme, debloque, reussies))}
                            className="rounded-xl px-4 py-2.5 text-sm font-black text-white" style={{ background: ROUGE }}>Y aller</button>
                    </div>
                )}
                {erreurs.length > 0 && (
                    <div className="rounded-[24px] border-2 border-slate-900 bg-white p-5">
                        <p className="mb-3 font-black text-slate-900">À retenir ({erreurs.length} erreur{erreurs.length > 1 ? "s" : ""})</p>
                        {erreurs.map((it) => (
                            <div key={it.q.id} className="mb-2 rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                                <p className="text-sm font-bold text-slate-500">{it.q.q}</p>
                                <p className="mt-0.5 text-sm font-black text-emerald-700">✓ {it.q.r[0]}</p>
                            </div>
                        ))}
                    </div>
                )}
                <div className="flex justify-center gap-3">
                    {!partie.duJour && (
                        <button type="button" onClick={() => lancer(partie.titre, partie.items.map((it) => it.q))} className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><RotateCcw size={16} /> Rejouer</button>
                    )}
                    <button type="button" onClick={() => { setPartie(null); charger(); }} className="flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white">Retour aux thèmes <ArrowRight size={16} /></button>
                </div>
            </div>
        );
    }

    /* ───────────── Accueil ───────────── */
    return (
        <div className="mx-auto max-w-[1180px] space-y-6">
            {entete}
            {horsLigne && (
                <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 ring-1 ring-amber-200">Tes réponses sont gardées sur cet appareil le temps que le quiz soit activé pour toute l&apos;équipe.</p>
            )}

            <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#cd1e25] via-[#b3171d] to-[#7f1015] p-6 text-white shadow-[0_20px_60px_rgba(205,30,37,.3)] sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-5">
                    <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.25em] text-white/75"><Zap size={14} /> Question du jour</p>
                        <p className="mt-2 max-w-2xl text-xl font-black leading-snug sm:text-2xl">{qJour.q}</p>
                        <p className="mt-2 text-sm font-semibold text-white/75">1 question · +10 points · la même pour toute l&apos;équipe</p>
                    </div>
                    {jourFait ? (
                        <span className="flex shrink-0 items-center gap-2 rounded-2xl bg-white/20 px-6 py-4 text-base font-black">✓ Déjà répondu</span>
                    ) : (
                        <button type="button" onClick={() => lancer("Question du jour", [qJour], true)} className="flex shrink-0 items-center gap-2 rounded-2xl bg-white px-6 py-4 text-base font-black text-slate-900 shadow-lg hover:-translate-y-0.5">Répondre <ArrowRight size={18} /></button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                {THEMES_QUIZ.map((t) => {
                    const total = QUESTIONS.filter((q) => q.theme === t.id);
                    const faites = total.filter((q) => reussies.has(q.id)).length;
                    return (
                        <div key={t.id} className="flex flex-col overflow-hidden rounded-[24px] border-2 border-slate-900 bg-white">
                            <div className={`bg-gradient-to-br ${t.grad} px-6 py-5 text-white`}>
                                <p className="text-4xl">{t.emoji}</p>
                                <p className="mt-2 text-2xl font-black">{t.titre}</p>
                                <p className="text-sm font-semibold text-white/80">{t.sous}</p>
                                <div className="mt-3 flex justify-between text-xs font-bold text-white/80"><span>{faites} / {total.length} questions réussies</span><span>{Math.round((faites / total.length) * 100)} %</span></div>
                                <div className="mt-1 h-2 rounded-full bg-white/20"><div className="h-full rounded-full bg-white" style={{ width: `${(faites / total.length) * 100}%` }} /></div>
                            </div>
                            <div className="flex-1 space-y-2 p-4">
                                {([1, 2, 3] as NiveauQuiz[]).map((n) => {
                                    const qs = questionsDe(t.id, n);
                                    const ok = qs.filter((q) => reussies.has(q.id)).length;
                                    const libre = niveauDebloque(t.id, n, reussies);
                                    const fini = niveauTermine(t.id, n, reussies);
                                    const expert = n === 3;
                                    return (
                                        <div key={n} className={`rounded-2xl p-3 ${libre ? (expert ? "bg-amber-50 ring-1 ring-amber-200" : "bg-slate-50 ring-1 ring-slate-200") : "bg-slate-50/60 ring-1 ring-dashed ring-slate-200"}`}>
                                            <div className="flex items-center gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <p className={`flex items-center gap-1.5 text-sm font-black ${libre ? "text-slate-900" : "text-slate-400"}`}>
                                                        {expert ? "🧠" : n === 1 ? "🌱" : "🚀"} {NIVEAUX_QUIZ[n].label}
                                                        {fini && <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-black text-white">✓ terminé</span>}
                                                    </p>
                                                    <p className="text-[11px] font-bold text-slate-400">
                                                        {libre ? `${ok} / ${qs.length} réussies · ${NIVEAUX_QUIZ[n].points} pts par bonne réponse` : expert ? "Termine « Les bases » et « Confirmé » pour débloquer" : "Termine « Les bases » pour débloquer"}
                                                    </p>
                                                </div>
                                                {libre ? (
                                                    <button type="button" onClick={() => lancer(`${t.titre} · ${NIVEAUX_QUIZ[n].label}`, composerSerie(t.id, n, reussies))}
                                                        className="shrink-0 rounded-xl px-3.5 py-2 text-sm font-black text-white" style={{ background: expert ? "#0f172a" : ROUGE }}>
                                                        {fini ? "Rejouer" : "Jouer"}
                                                    </button>
                                                ) : <Lock size={18} className="shrink-0 text-slate-300" />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
                <div className="rounded-[24px] border-2 border-slate-900 bg-white p-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="font-black text-slate-900">🔁 À revoir</p>
                        {aRevoir.length > 0 && (
                            <button type="button" onClick={() => lancer("Questions à revoir", melanger(aRevoir).slice(0, 10))} className="rounded-xl px-3 py-1.5 text-xs font-black text-white" style={{ background: ROUGE }}>
                                Revoir {Math.min(aRevoir.length, 10)} question{aRevoir.length > 1 ? "s" : ""}
                            </button>
                        )}
                    </div>
                    {aRevoir.length === 0 ? (
                        <p className="py-4 text-center text-sm font-semibold text-slate-400">Rien à revoir pour l&apos;instant 👌</p>
                    ) : aRevoir.slice(0, 5).map((q) => (
                        <div key={q.id} className="mb-2 flex items-center gap-3 rounded-xl bg-rose-50 px-3 py-2.5 ring-1 ring-rose-100">
                            <X size={16} className="shrink-0 text-rose-500" /><span className="flex-1 text-sm font-bold text-slate-700">{q.q}</span>
                        </div>
                    ))}
                </div>
                <div className="rounded-[24px] border-2 border-slate-900 bg-white p-5">
                    <p className="mb-3 font-black text-slate-900">🏆 Classement quiz · semaine</p>
                    {classement.length === 0 ? (
                        <p className="py-4 text-center text-sm font-semibold text-slate-400">Pas encore de points cette semaine.</p>
                    ) : classement.slice(0, 7).map((c, i) => (
                        <div key={c.id} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${c.id === conseillerId ? "bg-emerald-50 ring-1 ring-emerald-200" : ""}`}>
                            <span className="w-6 text-center">{["🥇", "🥈", "🥉"][i] ?? i + 1}</span>
                            <span className="flex-1 text-sm font-black text-slate-800">{c.nom}{c.id === conseillerId && <span className="ml-1 text-xs text-emerald-600">(toi)</span>}</span>
                            <span className="text-sm font-black tabular-nums text-slate-900">{c.points} pts</span>
                        </div>
                    ))}
                </div>
            </div>
            <p className="text-center text-[11px] font-semibold text-slate-400">{QUESTIONS.length} questions · sources free.fr, mobile.free.fr et assistance.free.fr, vérifiées le {QUIZ_VERIFIE_LE}</p>
        </div>
    );
}

export default function QuizPage() {
    return <Suspense><Quiz /></Suspense>;
}
