import os, textwrap, zipfile, shutil

page_tsx = textwrap.dedent("""\
"use client";

import React, { useMemo, useState } from "react";

/** ---------------- Types ---------------- */
type GeoState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "granted"; lat: number; lon: number; accuracyM: number; ts: number }
  | { status: "denied" }
  | { status: "error"; message: string };

type ArrivalChip = {
  route: string;
  minutes: number;
  kind: "live" | "scheduled";
};

type StopCard = {
  stopId: string;
  name: string;
  distanceM: number;
  arrivals: ArrivalChip[];
};

/** --------------- Helpers --------------- */
function fmt(n: number, digits = 5) {
  return n.toFixed(digits);
}

function distanceLabel(m: number) {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function InfoBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        marginTop: 8,
        padding: 12,
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        background: "#f9fafb",
      }}
    >
      <div style={{ fontWeight: 900, marginBottom: 6 }}>{title}</div>
      <div style={{ color: "#374151" }}>{children}</div>
    </div>
  );
}

function ConfidencePill({ kind }: { kind: "live" | "scheduled" }) {
  const live = kind === "live";
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 900,
        padding: "3px 8px",
        borderRadius: 999,
        border: `1px solid ${live ? "#10b981" : "#f59e0b"}`,
        background: live ? "#ecfdf5" : "#fffbeb",
        color: live ? "#065f46" : "#92400e",
      }}
    >
      {live ? "LIVE" : "SCHEDULED"}
    </span>
  );
}

function ArrivalPill({ a, showScheduled }: { a: ArrivalChip; showScheduled: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        gap: 8,
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid #e5e7eb",
        background: "#fff",
        fontSize: 12,
        fontWeight: 900,
      }}
    >
      <span
        style={{
          padding: "2px 8px",
          borderRadius: 999,
          background: "#111",
          color: "#fff",
        }}
      >
        {a.route}
      </span>

      <span style={{ color: "#222222" }}>{a.minutes} min</span>

      {(a.kind === "live" || showScheduled) && <ConfidencePill kind={a.kind} />}
    </span>
  );
}

/** ---------------- Page ---------------- */
export default function Home() {
  const [mode, setMode] = useState<"bus" | "subway">("bus");
  const [geo, setGeo] = useState<GeoState>({ status: "idle" });
  const [selectedStop, setSelectedStop] = useState<StopCard | null>(null);
  const [showLocationDetails, setShowLocationDetails] = useState(false);

  const canUseGeo = useMemo(() => typeof navigator !== "undefined" && !!navigator.geolocation, []);

  function setModeSafe(next: "bus" | "subway") {
    setMode(next);
    setSelectedStop(null);
  }

  /** Subway: ONE hardcoded station (safe). */
  const subwayMockStops: StopCard[] = useMemo(
    () => [
      {
        stopId: "TSQ",
        name: "Times Sq – 42 St",
        distanceM: 0,
        arrivals: [
          { route: "2 Uptown", minutes: 1, kind: "live" },
          { route: "1 Uptown", minutes: 2, kind: "live" },
          { route: "1 Downtown", minutes: 5, kind: "live" },
        ],
      },
    ],
    []
  );

  /** Bus mock stops. */
  const busMockStops = useMemo<StopCard[]>(() => {
    return [
      {
        stopId: "MTA_STOP_1",
        name: "E 42 St & 3 Av",
        distanceM: 180,
        arrivals: [
          { route: "M15", minutes: 2, kind: "live" },
          { route: "M15", minutes: 8, kind: "live" },
          { route: "M101", minutes: 10, kind: "scheduled" },
        ],
      },
      {
        stopId: "MTA_STOP_2",
        name: "Lexington Av & E 51 St",
        distanceM: 420,
        arrivals: [
          { route: "M5", minutes: 4, kind: "live" },
          { route: "M5", minutes: 12, kind: "scheduled" },
        ],
      },
      {
        stopId: "MTA_STOP_3",
        name: "Madison Av & E 39 St",
        distanceM: 670,
        arrivals: [
          { route: "M1", minutes: 6, kind: "live" },
          { route: "M2", minutes: 9, kind: "scheduled" },
        ],
      },
    ];
  }, []);

  const stopsForMode = useMemo<StopCard[]>(() => (mode === "subway" ? subwayMockStops : busMockStops), [
    mode,
    subwayMockStops,
    busMockStops,
  ]);

  /** Nearby list: show ONLY soonest arrival per route label. */
  const nearbyDisplayStops = useMemo<StopCard[]>(() => {
    return stopsForMode.map((s) => {
      const bestByRoute = new Map<string, ArrivalChip>();
      for (const a of s.arrivals) {
        const prev = bestByRoute.get(a.route);
        if (!prev || a.minutes < prev.minutes) bestByRoute.set(a.route, a);
      }
      return { ...s, arrivals: Array.from(bestByRoute.values()).sort((a, b) => a.minutes - b.minutes) };
    });
  }, [stopsForMode]);

  function requestLocation() {
    if (!canUseGeo) {
      setGeo({ status: "error", message: "Geolocation is not available in this browser/device." });
      return;
    }

    setGeo({ status: "requesting" });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({
          status: "granted",
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracyM: pos.coords.accuracy,
          ts: pos.timestamp || Date.now(),
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setGeo({ status: "denied" });
        else setGeo({ status: "error", message: err.message || "Could not get your location." });
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 10_000 }
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 560, margin: "0 auto" }}>
      <header>
        <h1 style={{ fontSize: 30, fontWeight: 950, margin: 0 }}>Buslee 🚍</h1>
        <p style={{ marginTop: 6, color: "#555" }}>Stop-first transit tracking for NYC.</p>

        <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
          <button
            onClick={() => setModeSafe("bus")}
            style={{
              padding: "10px 16px",
              borderRadius: 999,
              border: "1px solid #111",
              background: mode === "bus" ? "#fff" : "#111",
              color: mode === "bus" ? "#111" : "#fff",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Buses
          </button>

          <button
            onClick={() => setModeSafe("subway")}
            style={{
              padding: "10px 16px",
              borderRadius: 999,
              border: "1px solid #111",
              background: mode === "subway" ? "#fff" : "#111",
              color: mode === "subway" ? "#111" : "#fff",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Subway
          </button>
        </div>
      </header>

      {/* Step 1: Location */}
      <section
        style={{
          marginTop: 16,
          padding: 16,
          borderRadius: 14,
          border: "1px solid #ddd",
          background: "#fff",
        }}
      >
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>Step 1: Location</h2>
        <p style={{ marginTop: 8, color: "#555" }}>
          We use your location to show nearby {mode === "bus" ? "stops" : "stations"} instantly—no searching.
        </p>

        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <button
            onClick={requestLocation}
            disabled={geo.status === "requesting"}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #111",
              background: geo.status === "requesting" ? "#eee" : "#111",
              color: geo.status === "requesting" ? "#111" : "#fff",
              fontWeight: 900,
              cursor: geo.status === "requesting" ? "not-allowed" : "pointer",
            }}
          >
            {geo.status === "requesting" ? "Getting location…" : "Use my location"}
          </button>

          <button
            onClick={() => {
              setGeo({ status: "idle" });
              setSelectedStop(null);
              setShowLocationDetails(false);
            }}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "#fff",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Reset
          </button>
        </div>

        <div style={{ marginTop: 14 }}>
          {geo.status === "idle" && (
            <InfoBox title="Next step">
              Tap <b>Use my location</b>. If your browser asks for permission, choose <b>Allow</b>.
            </InfoBox>
          )}

          {geo.status === "requesting" && <InfoBox title="Working">Waiting for GPS…</InfoBox>}

          {geo.status === "granted" && (
            <div
              style={{
                padding: 14,
                borderRadius: 12,
                border: "1px solid #d1fae5",
                background: "#ecfdf5",
              }}
            >
              <div style={{ fontWeight: 950, marginBottom: 6, color: "#065f46" }}>Location found ✅</div>

              <button
                onClick={() => setShowLocationDetails((v) => !v)}
                style={{
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  color: "#065f46",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {showLocationDetails ? "Hide details" : "Show details"}
              </button>

              {showLocationDetails && (
                <>
                  <div
                    style={{
                      marginTop: 10,
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                      color: "#064e3b",
                    }}
                  >
                    lat: {fmt(geo.lat)} <br />
                    lon: {fmt(geo.lon)} <br />
                    accuracy: ~{Math.round(geo.accuracyM)}m
                  </div>
                  <div style={{ marginTop: 8, color: "#065f46", fontSize: 12 }}>
                    Updated: {new Date(geo.ts).toLocaleTimeString()}
                  </div>
                </>
              )}
            </div>
          )}

          {geo.status === "denied" && (
            <InfoBox title="Location blocked">
              Your browser denied location. Enable location for <b>buslee.com</b> then try again.
            </InfoBox>
          )}

          {geo.status === "error" && (
            <InfoBox title="Couldn’t get location">
              {geo.message} <br />
              Tip: Make sure you’re using <b>https://buslee.com</b> and location is enabled.
            </InfoBox>
          )}

          {!canUseGeo && (
            <InfoBox title="Geolocation unavailable">
              This browser/device doesn’t support geolocation. Try Chrome on a phone.
            </InfoBox>
          )}
        </div>
      </section>

      {/* Step 2: Nearby Stops / Stations */}
      <section style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 950, marginBottom: 10 }}>
          {mode === "bus" ? "Nearby Stops" : "Nearby Stations"}
        </h2>

        {geo.status !== "granted" ? (
          <InfoBox title={`Enable location to see nearby ${mode === "bus" ? "stops" : "stations"}`}>
            Tap <b>Use my location</b> above and choose <b>Allow</b> when prompted.
          </InfoBox>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {nearbyDisplayStops.map((s) => (
              <div
                key={s.stopId}
                style={{
                  padding: 14,
                  borderRadius: 14,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontWeight: 950, color: "#111111" }}>{s.name}</div>
                  <div style={{ color: "#6b7280", fontWeight: 900, fontSize: 12 }}>
                    {distanceLabel(s.distanceM)}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                  {s.arrivals.map((a, idx) => (
                    <ArrivalPill key={idx} a={a} showScheduled={false} />
                  ))}
                </div>

                <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#6b7280", fontSize: 12 }}>Updated just now</span>

                  <button
                    onClick={() => setSelectedStop(s)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid #111",
                      background: "#111",
                      color: "#fff",
                      fontWeight: 950,
                      cursor: "pointer",
                    }}
                  >
                    {mode === "bus" ? "See buses at this stop →" : "See trains at this station →"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Step 3: Stop Board */}
      {selectedStop && (
        <section
          style={{
            marginTop: 24,
            padding: 16,
            borderRadius: 16,
            border: "2px solid #111",
            background: "#fff",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: 20, fontWeight: 950, margin: 0 }}>{selectedStop.name}</h2>

            <button
              onClick={() => setSelectedStop(null)}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid #ddd",
                background: "#fff",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Back
            </button>
          </div>

          <p style={{ marginTop: 6, color: "#6b7280", fontSize: 12 }}>
            Updated just now · Trust labels shown per arrival
          </p>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {selectedStop.arrivals.map((a, idx) => (
              <div
                key={idx}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  background: "#f9fafb",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: "#111",
                      color: "#fff",
                      fontWeight: 950,
                    }}
                  >
                    {a.route}
                  </span>

                  <span style={{ fontWeight: 950, fontSize: 18, color: "#222222" }}>{a.minutes} min</span>

                  <ConfidencePill kind={a.kind} />
                </div>

                <button
                  onClick={() =>
                    alert(mode === "bus" ? "Next: Track This Bus (map + live movement)." : "Next: Track This Train.")
                  }
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1px solid #111",
                    background: "#111",
                    color: "#fff",
                    fontWeight: 950,
                    cursor: "pointer",
                  }}
                >
                  {mode === "bus" ? "Track Bus →" : "Track Train →"}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer style={{ marginTop: 18, color: "#777", fontSize: 12 }}>
        Next: Replace mock data with real {mode === "bus" ? "bus" : "subway"} data.
      </footer>
    </main>
  );
}
""")

subway_route_ts = textwrap.dedent("""\
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
    r.status === "fulfilled" ? r.value : { url: FEEDS[i], ok: false, status: 0, bytes: 0 }
  );

  const okCount = feeds.filter((f) => f.ok).length;

  return NextResponse.json({
    ok: okCount > 0,
    okCount,
    feeds,
    time: Date.now(),
  });
}
""")

staging = "/mnt/data/buslee_fix_default_export"
if os.path.exists(staging):
    shutil.rmtree(staging)
os.makedirs(staging, exist_ok=True)

page_path = os.path.join(staging, "apps/web/src/app/page.tsx")
os.makedirs(os.path.dirname(page_path), exist_ok=True)
with open(page_path, "w", encoding="utf-8") as f:
    f.write(page_tsx)

route_path = os.path.join(staging, "apps/web/src/app/api/subway/route.ts")
os.makedirs(os.path.dirname(route_path), exist_ok=True)
with open(route_path, "w", encoding="utf-8") as f:
    f.write(subway_route_ts)

zip_out = "/mnt/data/buslee_fixed_page_and_subway_route.zip"
if os.path.exists(zip_out):
    os.remove(zip_out)

with zipfile.ZipFile(zip_out, "w", zipfile.ZIP_DEFLATED) as z:
    z.write(page_path, arcname="apps/web/src/app/page.tsx")
    z.write(route_path, arcname="apps/web/src/app/api/subway/route.ts")

zip_out
