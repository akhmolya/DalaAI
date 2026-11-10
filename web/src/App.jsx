import { NavLink, Route, Routes, Link, useParams } from "react-router-dom";
import { useState } from "react";
import { useData } from "./lib/data.jsx";
import { formatYear } from "./lib/model.js";
import { useT } from "./i18n/index.jsx";
import Simulator from "./components/Simulator.jsx";
import RiskTimeline from "./components/RiskTimeline.jsx";
import Timeline from "./components/Timeline.jsx";
import ModelPage from "./components/ModelPage.jsx";
import { DataPage } from "./components/StageSixPages.jsx";

const navItems = [
  ["home", "/"],
  ["timeline", "/timeline"],
  ["states", "/states"],
  ["simulator", "/simulator"],
  ["model", "/model"],
  ["data", "/data"],
];

export default function App() {
  const { loading, error, data } = useData();
  const t = useT();
  if (loading) return <div className="status-screen">{t.loading}</div>;
  if (error) return <div className="status-screen">{t.dataError}: {String(error)}</div>;

  return (
    <div className="site-shell">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home data={data} />} />
          <Route path="/timeline" element={<Timeline polities={data.polities} />} />
          <Route path="/states" element={<States polities={data.polities} />} />
          <Route path="/states/:id" element={<StatePage polities={data.polities} model={data.model} />} />
          <Route path="/simulator" element={<Simulator model={data.model} polities={data.polities} />} />
          <Route path="/model" element={<ModelPage importance={data.importance} hypotheses={data.hypotheses} metrics={data.metrics} />} />
          <Route path="/data" element={<DataPage polities={data.polities} model={data.model} />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <Link to="/" className="wordmark" onClick={() => setOpen(false)}>
        <span className="wordmark-mark" aria-hidden="true">✦</span>
        <span><strong>{t.brand}</strong><small>{t.brandTagline}</small></span>
      </Link>
      <button className="menu-toggle" type="button" aria-label="Мәзірді ашу" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span /><span /><span />
      </button>
      <nav className={open ? "main-nav is-open" : "main-nav"}>
        {navItems.map(([key, path]) => (
          <NavLink key={path} to={path} end={path === "/"} onClick={() => setOpen(false)}>
            {t.navigation[key]}
          </NavLink>
        ))}
        <span className="language-chip" aria-label="Таңдалған тіл">{t.language}</span>
      </nav>
    </header>
  );
}

function Footer() {
  const t = useT();
  return (
    <footer className="site-footer">
      <Ornament />
      <div className="footer-inner">
        <div><strong>{t.brand}</strong><p>{t.footer.note}</p></div>
        <p>{t.footer.source}<br />{t.footer.copyright}</p>
      </div>
    </footer>
  );
}

function Ornament() {
  return (
    <svg className="ornament" viewBox="0 0 640 48" role="img" aria-label="Қошқар мүйіз оюы">
      <path d="M0 24h130c14 0 18-17 5-20-15-3-22 16-8 22 17 7 28-11 38-18 17-12 33 0 30 12-4 18-31 20-40 4-7-13 9-27 21-18 10 8 4 22-7 22H0m640 0H510c-14 0-18-17-5-20 15-3 22 16 8 22-17 7-28-11-38-18-17-12-33 0-30 12 4 18 31 20 40 4 7-13-9-27-21-18-10 8-4 22 7 22h129M250 24h140" />
      <path d="M280 24c0-12 8-18 16-18s16 6 16 18-8 18-16 18-16-6-16-18Zm64 0c0-12-8-18-16-18s-16 6-16 18 8 18 16 18 16-6 16-18Z" />
    </svg>
  );
}

function Home({ data }) {
  const t = useT();
  const metrics = data.metrics;
  return (
    <div className="home">
      <section className="hero">
        <div className="stars" aria-hidden="true" />
        <div className="hero-content">
          <p className="eyebrow">{t.hero.eyebrow}</p>
          <h1>{t.hero.title}</h1>
          <p className="hero-subtitle">{t.hero.subtitle}</p>
          <blockquote><p>«{t.hero.quote}»</p><cite>{t.hero.quoteCaption}</cite></blockquote>
          <div className="hero-actions">
            <Link className="button button-gold" to="/simulator">{t.hero.simulator}<span>↗</span></Link>
            <Link className="button button-outline" to="/states">{t.hero.states}<span>→</span></Link>
          </div>
        </div>
        <div className="steppe" aria-hidden="true"><div className="moon" /></div>
      </section>
      <section className="metrics-section">
        <p className="eyebrow">{t.hero.dataNote}</p>
        <div className="metrics">
          <Metric value={metrics.n_polities} label={t.hero.metricStates} />
          <Metric value={metrics.n_rows} label={t.hero.metricPeriods} />
          <Metric value={metrics.n_collapses} label={t.hero.metricCollapses} />
        </div>
      </section>
      <section className="purpose card-panel">
        <div><p className="eyebrow">{t.hero.purposeTitle}</p><h2>{t.hero.purposeTitle}</h2></div>
        <div><p>{t.hero.purpose}</p><div className="task-grid">{t.hero.tasks.map((task, index) => <div className="task-card" key={task}><span aria-hidden="true">{["◈", "⌁", "✦"][index]}</span><p>{task}</p></div>)}</div></div>
      </section>
    </div>
  );
}

function Metric({ value, label }) {
  return <div className="metric"><strong className="metric-value">{value}</strong><span>{label}</span></div>;
}

function States({ polities }) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [collapseType, setCollapseType] = useState("");
  const [sort, setSort] = useState("date-asc");
  const regions = [...new Set(polities.map((p) => p.region_kz))].sort();
  const collapseTypes = [...new Set(polities.map((p) => p.collapse_type_kz))].sort();
  const filtered = polities
    .filter((p) => !region || p.region_kz === region)
    .filter((p) => !collapseType || p.collapse_type_kz === collapseType)
    .filter((p) => `${p.name_kz} ${p.region_kz}`.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim()))
    .sort((a, b) => sort === "name" ? a.name_kz.localeCompare(b.name_kz, "kk") : sort === "date-desc" ? b.founded - a.founded : a.founded - b.founded);

  return (
    <section className="content-page">
      <p className="eyebrow">{t.navigation.states}</p>
      <h1>{t.navigation.states}</h1>
      <div className="state-filters" aria-label="Мемлекеттер сүзгілері">
        <label className="search-field"><span className="sr-only">{t.states.search}</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.states.search} /></label>
        <select value={region} onChange={(e) => setRegion(e.target.value)} aria-label={t.states.allRegions}><option value="">{t.states.allRegions}</option>{regions.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        <select value={collapseType} onChange={(e) => setCollapseType(e.target.value)} aria-label={t.states.allCollapseTypes}><option value="">{t.states.allCollapseTypes}</option>{collapseTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Сұрыптау"><option value="date-asc">{t.states.sortDateAsc}</option><option value="date-desc">{t.states.sortDateDesc}</option><option value="name">{t.states.sortName}</option></select>
      </div>
      <p className="results-count">{filtered.length} {t.states.count}</p>
      {filtered.length ? <div className="state-grid">{filtered.map((p) => <StateCard key={p.id} polity={p} />)}</div> : <div className="empty-state">{t.states.noResults}</div>}
    </section>
  );
}

function StateCard({ polity }) {
  const t = useT();
  const latest = polity.windows[polity.windows.length - 1];
  return <Link to={`/states/${polity.id}`} className="state-card"><span>{polity.region_kz}</span><h2>{polity.name_kz}</h2><p>{formatYear(polity.founded)} — {formatYear(polity.collapse_year)}</p><div className="state-card-foot"><b>{Math.round(latest["risk_" + "oof"] * 100)}%</b><small>{t.states.risk}</small><i aria-hidden="true">→</i></div></Link>;
}

function StatePage({ polities, model }) {
  const t = useT();
  const { id } = useParams();
  const p = polities.find((x) => x.id === id);
  if (!p) return <Placeholder title={t.states.notFound} />;
  const labels = Object.fromEntries(model.features.map((feature) => [feature.key, feature.label_kz]));
  const heritage = [
    ["own_script", "Өзіндік жазуы"],
    ["written_law", "Жазбаша заңы"],
    ["succession_system", "Мұрагерлік жүйесі"],
    ["appanage_system", "Ұлыстық жүйесі"],
    ["sedentarization", "Отырықшылық белгілері"],
  ];
  return (
    <section className="content-page state-detail">
      <Link className="back-link" to="/states">← {t.navigation.states}</Link>
      <p className="eyebrow">{p.region_kz}</p>
      <h1>{p.name_kz}</h1>
      <p className="lead">{formatYear(p.founded)} — {formatYear(p.collapse_year)} · {p.lifespan} жыл</p>
      <div className="state-facts">
        <Fact label={t.states.founded} value={formatYear(p.founded)} />
        <Fact label={t.states.collapse} value={formatYear(p.collapse_year)} />
        <Fact label={t.states.lifespan} value={`${p.lifespan} жыл`} />
        <Fact label={t.states.collapseType} value={p.collapse_type_kz} />
      </div>
      <p className="state-description">{p.collapse_desc_kz}</p>
      <section className="detail-section">
        <div className="section-heading"><p className="eyebrow">{t.states.timeline}</p><h2>{t.states.risk}</h2></div>
        <RiskTimeline polity={p} />
      </section>
      <section className="detail-section">
        <p className="eyebrow">{t.states.heritage}</p>
        <div className="heritage-grid">{heritage.map(([key, label]) => <div key={key} className={p.static[key] ? "heritage-item is-present" : "heritage-item"}><span aria-hidden="true">{p.static[key] ? "✦" : "—"}</span><b>{label}</b><small>{p.static[key] ? t.states.present : t.states.absent}</small></div>)}</div>
      </section>
      <section className="detail-section">
        <p className="eyebrow">{t.states.windows}</p>
        <div className="table-wrap"><table className="windows-table"><thead><tr><th>{t.states.window}</th><th>{t.states.risk}</th><th>{t.states.drivers}</th><th>{t.states.events}</th><th>{t.states.confidence}</th></tr></thead><tbody>{p.windows.map((w) => <tr key={`${w.start}-${w.end}`}><td>{formatYear(w.start)}–{formatYear(w.end)}</td><td><strong className="risk-number">{Math.round(w["risk_" + "oof"] * 100)}%</strong></td><td>{w.top_drivers.map((driver) => <span className="driver-tag" key={driver.key}>{labels[driver.key] || driver.key}</span>)}</td><td>{w.key_events_kz}</td><td><span className={`confidence confidence-${w.confidence.toLowerCase()}`}>{w.confidence}</span></td></tr>)}</tbody></table></div>
      </section>
      <section className="sources-block"><p className="eyebrow">{t.states.sources}</p><p>{p.sources}</p><Link className="button button-blue" to={`/simulator?preset=${p.id}:0`}>{t.states.simulator}<span>↗</span></Link><small>{t.states.allData}</small></section>
    </section>
  );
}

function Fact({ label, value }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}
