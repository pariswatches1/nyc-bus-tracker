import { NextResponse } from "next/server";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";

const FEED = "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs";
const TIMES_SQ_STOPS = new Set(["127N", "127S"]); // Times Sq – 42 St (1/2/3)

function minutesFromNow(epochSeconds: number) {
  const ms = epochSeconds * 1000 - Date.now();
  return Math.max(0, Math.round(ms / 60000));
}

export async function GET() {
  const apiKey = process.env.MTA_API_KEY; // optional
  const headers: Record<string, string> = apiKey ? { "x-api-key": apiKey } : {};

  const res = await fetch(FEED, { headers, cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json({ ok: false, status: res.status }, { status: 500 });
  }

  const buf = new Uint8Array(await res.arrayBuffer());
  const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buf);

  const arrivals: { route: string; minutes: number; kind: "live" }[] = [];

  for (const entity of feed.entity) {
    const tu = entity.tripUpdate;
    if (!tu?.stopTimeUpdate?.length) continue;

    for (const stu of tu.stopTimeUpdate) {
      const stopId = stu.stopId;
      if (!stopId || !TIMES_SQ_STOPS.has(stopId)) continue;

      const t =
        stu.arrival?.time?.toNumber?.() ??
        stu.departure?.time?.toNumber?.();

      if (!t) continue;

      const dir = stopId.endsWith("N") ? "Uptown" : "Downtown";
      const routeId =
        (tu.trip?.routeId as string | undefined) ??
        (tu.trip?.tripId ? String(tu.trip.tripId).slice(0, 1) : "Train");

      arrivals.push({ route: `${routeId} ${dir}`, minutes: minutesFromNow(t), kind: "live" });
    }
  }

  arrivals.sort((a, b) => a.minutes - b.minutes);

  return NextResponse.json({
    ok: true,
    station: "Times Sq – 42 St",
    arrivals: arrivals.slice(0, 6),
    time: Date.now(),
  });
}
