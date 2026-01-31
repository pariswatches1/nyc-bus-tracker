"use client";

import { useMemo, useState } from "react";

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
      <div style={{ fontWeight: 800, marginBottom: 6 }}>{title}</div>
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
        fontWeight: 800,
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

function ArrivalPill({ a }: { a: ArrivalChip }) {
  return (
    <span
      style={{
        display: "inline-flex",
        gap: 6,
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid #e5e7eb",
        background: "#fff",
        fontSize: 12,
        fontWeight: 800,
      }}
    >
      <span style={{ padding: "2px 8px", borderRadius: 999, background: "#111", color: "#fff" }}>
        {a.route}
      </span>
      <span>{a.minutes} min</span>
      <ConfidencePill kind={a.kind} />
    </span>
  );
}

export default function Home() {
  const [geo, setGeo] = useState<GeoState>({ status: "idle" });

  const canUseGeo = useMemo(() => typeof navigator !== "undefined" && !!navigator.geolocation, []);

  // Mock nearby stops (for Step 2). Later we replace this with real MTA data.
  const mockStops: StopCard[] = useMemo(() => {
    // Small variation just to look realistic
    const base = [
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
    return base;
  }, []);

  async function requestLocation() {
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
        <h1 style={{ fontSize: 30, fontWeight: 900, margin: 0 }}>Buslee 🚍</h1>
        <p style={{ marginTop: 6, color: "#555" }}>Stop-first bus tracking for NYC.</p>
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
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Step 1: Location</h2>
        <p style={{ marginTop: 8, color: "#555" }}>
          We use your location to show nearby stops instantly—no searching.
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
              fontWeight: 800,
              cursor: geo.status === "requesting" ? "not-allowed" : "pointer",
            }}
          >
            {geo.status === "requesting" ? "Getting location…" : "Use my location"}
          </button>

          <button
            onClick={() => setGeo({ status: "idle" })}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "#fff",
              fontWeight: 800,
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
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Location received ✅</div>
              <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                lat: {fmt(geo.lat)} <br />
                lon: {fmt(geo.lon)} <br />
                accuracy: ~{Math.round(geo.accuracyM)}m
              </div>
              <div style={{ marginTop: 8, color: "#065f46", fontSize: 12 }}>
                Updated: {new Date(geo.ts).toLocaleTimeString()}
              </div>
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
              This browser/device doesn’t support geolocation. Try Chrome or Safari on a phone.
            </InfoBox>
          )}
        </div>
      </section>

      {/* Step 2: Nearby Stops (only shows after location granted) */}
      <section style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 900, marginBottom: 8 }}>Nearby Stops</h2>

        {geo.status !== "granted" ? (
          <InfoBox title="Waiting for location">
            Enable location above to see nearby stops.
          </InfoBox>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {mockStops.map((s) => (
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
                  <div style={{ fontWeight: 900 }}>{s.name}</div>
                  <div style={{ color: "#6b7280", fontWeight: 800, fontSize: 12 }}>
                    {distanceLabel(s.distanceM)}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                  {s.arrivals.map((a, idx) => (
                    <ArrivalPill key={idx} a={a} />
                  ))}
                </div>

                <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#6b7280", fontSize: 12 }}>
                    Updated just now
                  </span>

                  <button
                    onClick={() => alert(`Next step: Stop Board for ${s.stopId} (we’ll build this next).`)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid #111",
                      background: "#111",
                      color: "#fff",
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    Open Stop Board →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer style={{ marginTop: 18, color: "#777", fontSize: 12 }}>
        Next: Nearby Stops (real data) → Stop Board → Track Bus.
      </footer>
    </main>
  );
}
