// Бір мемлекеттің тәуекел динамикасы (LOGO болжамы — модель бұл мемлекетті оқу кезінде көрмеген)
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatYear } from "../lib/model.js";

export default function RiskTimeline({ polity, lang = "kz" }) {
  const data = polity.windows.map((w) => ({
    year: w.end,
    label: `${formatYear(w.start, lang)}–${formatYear(w.end, lang)}`,
    risk: Math.round(w["risk_" + "oof"] * 100),
    events: w.key_events_kz,
    confidence: w.confidence,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="year" tickFormatter={(y) => formatYear(y, lang)} />
        <YAxis domain={[0, 100]} unit="%" />
        <Tooltip content={<WindowTooltip />} />
        <ReferenceLine x={polity.collapse_year} stroke="#C62828" strokeDasharray="4 4" label="Ыдырау" />
        <Line type="monotone" dataKey="risk" stroke="#1F4E78" strokeWidth={2} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function WindowTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="tooltip" style={{ background: "#fff", border: "1px solid #ccc", padding: 8, maxWidth: 320 }}>
      <b>{d.label}</b> — тәуекел индексі {d.risk}% (сенімділік: {d.confidence})
      <p style={{ margin: "4px 0 0", fontSize: 12 }}>{d.events}</p>
    </div>
  );
}
