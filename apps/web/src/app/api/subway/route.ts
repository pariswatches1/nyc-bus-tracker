import { NextResponse } from "next/server";

const FEED =
  "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs"; // 1/2/3/4/5/6/7

export async function GET() {
  const apiKey = process.env.MTA_API_KEY; // optional
  const headers: Record<string, string> = apiKey ? { "x-api-key": apiKey } : {};

  try {
    const res = await fetch(FEED, { headers, cache: "no-store" });

    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        status: res.status,
        message: "Feed request failed",
      });
    }

    const bytes = (await res.arrayBuffer()).byteLength;

    return NextResponse.json({
      ok: true,
      status: res.status,
      bytes, // if this is > 0, you got real subway data
      message: "Got real subway feed data",
      time: Date.now(),
    });
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      message: e?.message || "Fetch failed",
    });
  }
}
