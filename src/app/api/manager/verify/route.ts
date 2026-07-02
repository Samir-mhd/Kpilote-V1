import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const { code } = await req.json();

    const PIN  = process.env.MANAGER_PIN;
    const valid = PIN && code === PIN;

    if (!valid) {
        return NextResponse.json({ ok: false }, { status: 401 });
    }

    return NextResponse.json({ ok: true });
}
