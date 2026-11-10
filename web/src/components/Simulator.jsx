// Модель белгілерін өзгертіп, тәуекел индексін салыстыру.
import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Cell, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import { useSearchParams } from "react-router-dom";
import { predictRisk, riskLevel, windowToValues, formatYear } from "../lib/model.js";
import { useT } from "../i18n/index.jsx";

const GROUPS = {
  time: "Уақыт",
  political: "Саяси тұрақтылық",
  military: "Әскери орта",
  external: "Сыртқы орта",
  economic: "Экономика",
  territory: "Аумақ",
  ecology: "Экология",
  culture: "Мәдениет",
  ethnography: "Этнография",
};

export default function Simulator({ model, polities, lang = "kz" }) {
  const t = useT();
  const [searchParams, setSearchParams] = useSearchParams();
  const defaults = useMemo(() => Object.fromEntries(model.features.map((f) => [f.key, f.default])), [model]);
  const presets = useMemo(() => polities.flatMap((polity) =>
    polity.windows.map((window, index) => ({
      id: `${polity.id}:${index}`,
      name: `${polity.name_kz}, ${formatYear(window.start, lang)}–${formatYear(window.end, lang)}`,
      polity,
      window,
    }))
  ), [polities, lang]);
  const [values, setValues] = useState(defaults);
  const [preset, setPreset] = useState("");

  useEffect(() => {
    const urlPreset = searchParams.get("preset") || "";
    const selected = presets.find((item) => item.id === urlPreset);
    setPreset(urlPreset);
    setValues(selected ? { ...defaults, ...windowToValues(selected.polity, selected.window) } : defaults);
  }, [defaults, presets, searchParams]);

  const { p, contributions } = useMemo(() => predictRisk(model, values), [model, values]);
  const level = riskLevel(p);
  const label = (feature) => feature[`label_${lang}`] ?? feature.label_kz;
  const groupedFeatures = Object.entries(GROUPS).map(([group, title]) => ({
    group,
    title,
    features: model.features.filter((feature) => feature.group === group),
  })).filter((group) => group.features.length);

  const applyPreset = (id) => {
    const selected = presets.find((item) => item.id === id);
    setPreset(id);
    setSearchParams(id ? { preset: id } : {});
    setValues(selected ? { ...defaults, ...windowToValues(selected.polity, selected.window) } : defaults);
  };

  const updateValue = (key, value) => {
    setPreset("");
    setSearchParams({});
    setValues((current) => ({ ...current, [key]: value }));
  };

  const chartData = contributions.map((item) => ({
    name: label(model.features.find((feature) => feature.key === item.key) || item).split(":")[0],
    value: +item.contribution.toFixed(3),
  }));

  return (
    <section className="simulator-page">
      <header className="simulator-heading">
        <p className="eyebrow">Интерактивті зертхана</p>
        <h1>{t.simulator.title}</h1>
        <p>{t.simulator.subtitle}</p>
      </header>
      <div className="simulator">
        <div className="sim-controls">
          <label className="preset-label">
            <span>Тарихи сәтті таңдау</span>
            <select value={preset} onChange={(event) => applyPreset(event.target.value)}>
              <option value="">— өз сценарийім —</option>
              {presets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>

          {groupedFeatures.map(({ group, title, features }) => (
            <fieldset className="feature-group" key={group}>
              <legend>{title}</legend>
              {features.map((feature) => (
                <label key={feature.key} className="slider" title={feature.label_kz}>
                  <span className="slider-title">{label(feature)} <b>{values[feature.key]}</b></span>
                  <input
                    aria-label={label(feature)}
                    type="range"
                    min={feature.min}
                    max={feature.max}
                    step={feature.step}
                    value={values[feature.key]}
                    onChange={(event) => updateValue(feature.key, Number(event.target.value))}
                  />
                  <small>{feature.min} — {feature.max} · Модель белгісінің мәні</small>
                </label>
              ))}
            </fieldset>
          ))}
          <button className="reset-button" type="button" onClick={() => applyPreset("")}>Қалпына келтіру</button>
        </div>

        <div className="sim-result">
          <RiskMeter value={p} level={level} lang={lang} />
          <p className="note">{t.simulator.note}</p>
          <h2>Факторлардың үлесі</h2>
          <p className="chart-note">Оң мән тәуекел индексін арттырады, теріс мән төмендетеді.</p>
          <ResponsiveContainer width="100%" height={420}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 150, right: 12 }}>
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={145} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => [value, "үлес"]} />
              <ReferenceLine x={0} stroke="#888" />
              <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                {chartData.map((item) => <Cell key={item.name} fill={item.value > 0 ? "#C62828" : "#2E7D32"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

function RiskMeter({ value, level, lang }) {
  const angle = `${-90 + value * 180}deg`;
  return (
    <div className="risk-meter" aria-label={`Тәуекел индексі: ${Math.round(value * 100)}%`}>
      <div className="meter-arc">
        <div className="meter-needle" style={{ "--needle-angle": angle }} />
        <div className="meter-center" />
        <span className="meter-min">0</span><span className="meter-max">100</span>
      </div>
      <div className="meter-value" style={{ color: level.color }}>{Math.round(value * 100)}<small>%</small></div>
      <div className="meter-label">тәуекел индексі · {level[lang]}</div>
    </div>
  );
}
