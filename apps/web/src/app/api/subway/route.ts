import { NextResponse } from "next/server";

const FEEDS = [
  "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs",
  "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace",
  "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm",
  "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-g",
  "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-jz",
  "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw",
  "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-l",
];

export async function GET() {
  const apiKey = process.env.MTA_API_KEY; // optional
  const headers: Record<string, string> = apiKey ? { "x-api-key": apiKey } : {};

  const results = await Promise.allSettled(
    FEEDS.map(async (url) => {
      const res = await fetch(url, { headers, cache: "no-store" });
      const bytes = res.ok ? (await res.arrayBuffer()).byteLength : 0;
      return { url, ok: res.ok, status: res.status, bytes };
    })
  );

  const feeds = results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { url: FEEDS[i], ok: false, status: 0, bytes: 0 }
  );

  const okCount = feeds.filter((f) => f.ok).length;

  return NextResponse.json({
    ok: okCount > 0,
    okCount,
    feeds,
    time: Date.now(),
  });
}
