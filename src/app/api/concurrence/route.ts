import { concurrenceEnCache } from "@/services/concurrenceCache";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Offres concurrentes (box + mobile) en cache, un relevé par opérateur. */
export async function GET() {
    return Response.json({ operateurs: await concurrenceEnCache() });
}
