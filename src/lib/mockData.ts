import { calculerMissions } from "@/engine/kpiloteEngine";

const planning = {
  joursPlanifiesMois: 22,
  joursTravailles: 16,
  joursPlanifiesSemaine: 5,
};

const kpisMensuels = [
  { produit: "Box", objectifMensuel: 24, realise: 18 },
  { produit: "Forfaits", objectifMensuel: 30, realise: 21 },
  { produit: "Téléphones", objectifMensuel: 12, realise: 8 },
  { produit: "McAfee", objectifMensuel: 10, realise: 6 },
  { produit: "Assurance", objectifMensuel: 15, realise: 9 },
];

export const missionsCalculees = calculerMissions(kpisMensuels, planning);

export const produits = missionsCalculees.map((mission) => ({
  produit: mission.produit,
  objectif: mission.objectifJour,
  realise: 0,
  couleur:
    mission.produit === "Box"
      ? "bg-green-500"
      : mission.produit === "Forfaits"
      ? "bg-blue-500"
      : mission.produit === "Téléphones"
      ? "bg-purple-500"
      : mission.produit === "McAfee"
      ? "bg-orange-500"
      : "bg-red-500",
}));

export const messagesCopilote = missionsCalculees.map((mission) => mission.message);