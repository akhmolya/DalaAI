import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { formatYear } from "../lib/model.js";

export function DataPage({ polities }) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const regions = [...new Set(polities.map((polity) => polity.region_kz))].sort();
  const rows = useMemo(() => polities.flatMap((polity) => polity.windows.map((window) => ({
    id: `${polity.id}-${window.start}`,
    polity: polity.name_kz,
    polityId: polity.id,
    region: polity.region_kz,
    start: window.start,
    end: window.end,
    risk: window["risk_" + "oof"],
    confidence: window.confidence,
    collapse: window.collapse,
    events: window.key_events_kz,
  }))).filter((row) => (!region || row.region === region) && `${row.polity} ${row.events}`.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim())), [polities, query, region]);
  const downloadCsv = () => {
    const header = ["polity_id", "polity", "region", "start", "end", "risk_index", "confidence", "collapse", "key_events_kz"];
    const body = rows.map((row) => [row.polityId, row.polity, row.region, row.start, row.end, row.risk, row.confidence, row.collapse, row.events]);
    const csv = [header, ...body].map((line) => line.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "dala-memleketteri-windows.csv";
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <section className="content-page stage-page">
      <p className="eyebrow">Ашық деректер</p>
      <h1>Деректер</h1>
      <p className="stage-lead">Сайтта қолданылатын барлық тарихи терезелер дерек қорынан оқылады.</p>
      <div className="data-toolbar"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Іздеу: мемлекет немесе оқиға" aria-label="Деректерді іздеу" /><select value={region} onChange={(event) => setRegion(event.target.value)} aria-label="Аймақ бойынша сүзу"><option value="">Барлық аймақ</option>{regions.map((item) => <option key={item}>{item}</option>)}</select><button className="button button-blue" type="button" onClick={downloadCsv}>CSV жүктеу ↧</button></div>
      <p className="results-count">{rows.length} терезе көрсетілді</p>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Мемлекет</th><th>Кезең</th><th>Тәуекел индексі</th><th>Сенімділік</th><th>Оқиғалар</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><Link to={`/states/${row.polityId}`}>{row.polity}</Link><small>{row.region}</small></td><td>{formatYear(row.start)}–{formatYear(row.end)}</td><td>{Math.round(row.risk * 100)}%</td><td>{row.confidence}</td><td>{row.events}</td></tr>)}</tbody></table></div>
    </section>
  );
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll("\"", "\"\"")}"`;
}
