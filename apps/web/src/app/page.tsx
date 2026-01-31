"use client";

import { useMemo, useState } from "react";

type GeoState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "granted"; lat: number; lon: number; accuracyM: number; ts: number }
  | { status: "denied" }
  | { status: "error"; message: string };

function fmt(n: number, digits = 5) {
  return n.toFixed(digits);
}

export default function Home() {
  const [geo, setGeo] = useState<GeoState>({ status: "idle" });

  const canUseGeo = useMemo(() => typeof navigator !== "undefined" && !!navigator.geolocation, []);

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
        // Common cases: user blocks location, insecure context, timeout, unavailable
        if (err.code === err.PERMISSION_DENIED) setGeo({ status: "denied" });
        else setGeo({ status: "error", message: err.message || "Could not get your location." });
      },
      {
        enableHighAccuracy: true,
        timeout: 12_000,
        maximumAge: 10_000,
      }
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Buslee 🚍</h1>
          <p style={{ marginTop: 6, color: "#555" }}>Stop-first bus tracking for NYC.</p>
        </div>
      </header>

      <section
        style={{
          marginTop: 18,
          padding: 16,
          borderRadius: 14,
          border: "1px solid #ddd",
          background: "#fff",
        }}
      >
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Step 1: Location</h2>
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
              fontWeight: 700,
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
              fontWeight: 700,
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

          {geo.status === "requesting" && (
            <InfoBox title="Working">
              Waiting for GPS… If this takes too long, try again or check your browser’s location
              permission.
            </InfoBox>
          )}

          {geo.status === "granted" && (
            <div
              style={{
                padding: 14,
                borderRadius: 12,
                border: "1px solid #d1fae5",
                background: "#ecfdf5",
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Location received ✅</div>
              <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                lat: {fmt(geo.lat)} <br />
                lon: {fmt(geo.lon)} <br />
                accuracy: ~{Math.round(geo.accuracyM)}m <br />
              </div>
              <div style={{ marginTop: 8, color: "#065f46", fontSize: 12 }}>
                Updated: {new Date(geo.ts).toLocaleTimeString()}
              </div>

              <div style={{ marginTop: 12 }}>
                <InfoBox title="Coming next">
                  Next we’ll convert this location into a list of <b>Nearby Stops</b>.
                </InfoBox>
              </div>
            </div>
          )}

          {geo.status === "denied" && (
            <InfoBox title="Location blocked">
              Your browser denied location. Fix it by enabling location for <b>buslee.com</b> in your
              browser settings, then try again.
            </InfoBox>
          )}

          {geo.status === "error" && (
            <InfoBox title="Couldn’t get location">
              {geo.message} <br />
              Tip: Make sure you’re using <b>https://buslee.com</b> (secure) and location is enabled.
            </InfoBox>
          )}

          {!canUseGeo && (
            <InfoBox title="Geolocation unavailable">
              This browser/device doesn’t support geolocation. Try Chrome or Safari on a phone.
            </InfoBox>
          )}
        </div>
      </section>

      <footer style={{ marginTop: 18, color: "#777", fontSize: 12 }}>
        Buslee is being built step-by-step. Next: Nearby Stops → Stop Board → Track Bus.
      </footer>
    </main>
  );
}

function InfoBox({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
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
