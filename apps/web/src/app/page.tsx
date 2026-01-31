export default function Home() {
  return (
    <main style={{ padding: 24, maxWidth: 480, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>
        NYC Bus Tracker 🚍
      </h1>

      <p style={{ marginTop: 12, color: "#555" }}>
        Real-time bus arrivals and live tracking.
      </p>

      <div
        style={{
          marginTop: 24,
          padding: 16,
          borderRadius: 12,
          border: "1px solid #ddd",
        }}
      >
        <p style={{ fontWeight: 600 }}>Next step:</p>
        <p style={{ marginTop: 8 }}>
          Enable location to see nearby bus stops.
        </p>
      </div>
    </main>
  );
}
