"use client";

type Props = {

    open: boolean;

    onClose: () => void;

    onCreate: () => void;

};

export default function CreateChallengeModal({

    open,

    onClose,

    onCreate,

}: Props) {

    if (!open) return null;

    return (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">

            <div className="w-full max-w-xl rounded-3xl bg-white p-8 shadow-2xl">

                <h2 className="text-3xl font-black">

                    ⚔ Nouveau défi

                </h2>

                <p className="mt-2 text-slate-500">

                    Choisis ton adversaire et configure ton défi.

                </p>

                <div className="mt-8 space-y-6">

                    <div>

                        <label className="font-bold">

                            Collègue

                        </label>

                        <select className="mt-2 w-full rounded-xl border p-3">

                            <option>

                                Julie

                            </option>

                            <option>

                                Thomas

                            </option>

                            <option>

                                Sarah

                            </option>

                        </select>

                    </div>

                    <div>

                        <label className="font-bold">

                            KPI

                        </label>

                        <select className="mt-2 w-full rounded-xl border p-3">

                            <option>

                                Fibre

                            </option>

                            <option>

                                Box

                            </option>

                            <option>

                                Assurance

                            </option>

                            <option>

                                Accessoires

                            </option>

                        </select>

                    </div>

                    <div>

                        <label className="font-bold">

                            Durée

                        </label>

                        <select className="mt-2 w-full rounded-xl border p-3">

                            <option>

                                30 minutes

                            </option>

                            <option>

                                45 minutes

                            </option>

                            <option>

                                60 minutes

                            </option>

                        </select>

                    </div>

                </div>

                <div className="mt-8 flex justify-end gap-4">

                    <button

                        onClick={onClose}

                        className="rounded-xl border px-6 py-3"

                    >

                        Annuler

                    </button>

                    <button

                        onClick={onCreate}

                        className="rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white"

                    >

                        Envoyer

                    </button>

                </div>

            </div>

        </div>

    );

}