"use client";

import { useState } from "react";

import ChallengeHero from "./ChallengeHero";
import ChallengeIntro from "./ChallengeIntro";
import ChallengeLive from "./ChallengeLive";
import ChallengeResult from "./ChallengeResult";
import ChallengeHistory from "./ChallengeHistory";

export default function ChallengeContainer() {

    const [intro, setIntro] =
        useState(true);

    const [live, setLive] =
        useState(false);

    const [result, setResult] =
        useState(false);

    return (

        <>

            <ChallengeHero

                conseiller="Stéphane"

                adversaire="Julie"

                produit="Fibre"

                temps="18:42"

                scoreMoi={3}

                scoreLui={2}

                message="Encore une Fibre et tu passes largement devant."

            />

            <ChallengeIntro

                open={intro}

                conseiller="Stéphane"

                adversaire="Julie"

                produit="Fibre"

                duree={30}

                onStart={() => {

                    setIntro(false);

                    setLive(true);

                }}

            />

            {live && (

                <ChallengeLive

                    conseiller="Stéphane"

                    adversaire="Julie"

                    scoreConseiller={3}

                    scoreAdversaire={2}

                    temps="18:42"

                    produit="Fibre"

                    message="Julie vient de vendre une Fibre."

                />

            )}

            <ChallengeResult

                open={result}

                victoire={true}

                conseiller="Stéphane"

                adversaire="Julie"

                scoreConseiller={5}

                scoreAdversaire={4}

                produit="Fibre"

                message="Excellent duel !"

                onClose={() =>

                    setResult(false)

                }

            />

            <ChallengeHistory

                historique={[]}

            />

        </>

    );

}