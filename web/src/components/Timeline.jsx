import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { formatYear } from "../lib/model.js";
import capitals from "../content/capitals.js";
import { useT } from "../i18n/index.jsx";

const START_YEAR = -250;
const END_YEAR = 1800;
const TICKS = [-250, 0, 250, 500, 750, 1000, 1250, 1500, 1800];

function riskColor(value) {
  if (value < 0.3) return "#2E7D32";
  if (value < 0.55) return "#F9A825";
  if (value < 0.75) return "#EF6C00";
  return "#C62828";
}

function position(year) {
  return `${Math.max(0, Math.min(100, ((year - START_YEAR) / (END_YEAR - START_YEAR)) * 100))}%`;
}

export default function Timeline({ polities }) {
  const t = useT();
  const [region, setRegion] = useState("");
  const regions = useMemo(() => [...new Set(polities.map((polity) => polity.region_kz))].sort(), [polities]);
  const visible = polities.filter((polity) => !region || polity.region_kz === region);
  const markers = visible.filter((polity) => {
    const capital = capitals[polity.id];
    return capital && Number.isFinite(capital.lat) && Number.isFinite(capital.lng);
  });

  return (
    <section className="content-page timeline-page">
      <p className="eyebrow">Зерттеу картасы</p>
      <h1>Уақыт сызығы</h1>
      <p className="timeline-intro">{t.timeline.description}</p>
      <div className="timeline-toolbar">
        <label><span>Аймақты таңдау</span><select value={region} onChange={(event) => setRegion(event.target.value)}><option value="">Барлық аймақ</option>{regions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <div className="risk-legend" aria-label="Тәуекел түс шкаласы">
          <span><i style={{ background: "#2E7D32" }} />Төмен</span>
          <span><i style={{ background: "#F9A825" }} />Орташа</span>
          <span><i style={{ background: "#EF6C00" }} />Жоғары</span>
          <span><i style={{ background: "#C62828" }} />Өте жоғары</span>
        </div>
      </div>
      <div className="timeline-scroll">
        <div className="timeline-canvas">
          <div className="timeline-years">{TICKS.map((year) => <span key={year} style={{ left: position(year) }}>{formatYear(year)}</span>)}</div>
          <div className="timeline-grid">
            {visible.map((polity) => <TimelineRow key={polity.id} polity={polity} />)}
          </div>
        </div>
      </div>
      <section className="map-section">
        <div className="section-heading"><p className="eyebrow">География</p><h2>Мемлекеттердің астаналары</h2></div>
        <div className="map-frame">
          <MapWithFallback markers={markers} />
        </div>
        <p className="map-caption">Астаналардың орны шамамен көрсетілген.</p>
      </section>
    </section>
  );
}

function TimelineRow({ polity }) {
  return (
    <div className="timeline-row">
      <Link className="timeline-label" to={`/states/${polity.id}`} title={polity.name_kz}>{polity.name_kz}</Link>
      <div className="timeline-track">
        {polity.windows.map((window) => <span key={`${window.start}-${window.end}`} className="timeline-window" title={`${formatYear(window.start)}–${formatYear(window.end)} · тәуекел индексі ${Math.round(window["risk_" + "oof"] * 100)}%`} style={{ left: position(window.start), width: `calc(${position(window.end)} - ${position(window.start)})`, background: riskColor(window["risk_" + "oof"]) }} />)}
        <span className="collapse-marker" style={{ left: position(polity.collapse_year) }} title={`${formatYear(polity.collapse_year)} · ыдырау`} />
      </div>
    </div>
  );
}

function MapWithFallback({ markers }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <FallbackMap markers={markers} />;
  return (
    <MapContainer className="timeline-map" center={[42, 75]} zoom={3} scrollWheelZoom={false}>
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" eventHandlers={{ tileerror: () => setFailed(true) }} />
      {markers.map((polity) => {
        const capital = capitals[polity.id];
        return <Marker key={polity.id} position={[capital.lat, capital.lng]}><Popup><Link to={`/states/${polity.id}`}>{polity.name_kz}</Link><br />{capital.name_kz}</Popup></Marker>;
      })}
    </MapContainer>
  );
}

function FallbackMap({ markers }) {
  return <svg className="timeline-map fallback-map" viewBox="0 0 760 430" role="img" aria-label="Еуразияның сызбалық картасы">
    <path d="M92 137 160 91l106-24 112 26 116-21 118 58 45 90-62 62-111 40-114-21-99 31-114-51-35-84Z" />
    <path className="fallback-water" d="M0 0h760v430H0z" />
    <path className="fallback-land" d="M92 137 160 91l106-24 112 26 116-21 118 58 45 90-62 62-111 40-114-21-99 31-114-51-35-84Z" />
    {markers.map((polity) => { const capital = capitals[polity.id]; const x = ((capital.lng - 20) / 130) * 760; const y = ((70 - capital.lat) / 60) * 430; return <g key={polity.id}><circle cx={x} cy={y} r="5" /><title>{polity.name_kz}: {capital.name_kz}</title></g>; })}
  </svg>;
}
