import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Subway API route is working",
    time: Date.now(),
  });
}
