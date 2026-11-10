import { useMemo } from "react";
import { useT } from "../i18n/index.jsx";

const AXIS_MIN = -1.3;
const AXIS_MAX = 1.1;

function axisPosition(value) {
  return `${((value - AXIS_MIN) / (AXIS_MAX - AXIS_MIN)) * 100}%`;
}

function modelName(key) {
  const names = {
    baseline_age: "Жасқа негізделген базалық модель",
    "logreg__all": "Логистикалық регрессия · барлық фактор",
    "logreg__no_territory": "Логистикалық регрессия · аумақсыз",
    "random_forest__all": "Кездейсоқ орман · барлық фактор",
    "random_forest__no_territory": "Кездейсоқ орман · аумақсыз",
    "gboost__all": "Градиенттік күшейту · барлық фактор",
    "gboost__no_territory": "Градиенттік күшейту · аумақсыз",
  };
  return names[key] || key;
}

export default function ModelPage({ importance, hypotheses, metrics }) {
  const t = useT();
  const collapseModels = metrics.results.collapse;
  const rankedImportance = useMemo(() => [...importance].sort((a, b) => Math.abs(b.coef_std) - Math.abs(a.coef_std)), [importance]);
  const maxAuc = Math.max(...Object.values(collapseModels).map((item) => item.roc_auc));

  return (
    <section className="content-page model-page">
      <p className="eyebrow">Талдау және дәлел</p>
      <h1>Модель не дейді</h1>
      <p className="model-lead">{t.model.lead}</p>

      <section className="model-section">
        <div className="section-heading">
          <p className="eyebrow">Факторлар</p>
          <h2>Коэффициенттер және 95% интервал</h2>
        </div>
        <p className="model-note">{t.model.coefficientNote}</p>
        <div className="coefficient-chart" role="img" aria-label="Фактор коэффициенттері мен 95 пайыздық интервалдары">
          <div className="coefficient-axis"><span style={{ left: axisPosition(-1) }}>−1</span><span style={{ left: axisPosition(0) }}>0</span><span style={{ left: axisPosition(1) }}>+1</span></div>
          {rankedImportance.map((item) => <CoefficientRow key={item.key} item={item} />)}
        </div>
      </section>

      <section className="model-section">
        <div className="section-heading"><p className="eyebrow">Гипотезалар</p><h2>Зерттеу болжамдары</h2></div>
        <p className="arrow-legend">{t.model.arrows}</p>
        <div className="hypothesis-grid">{hypotheses.map((hypothesis) => <HypothesisCard key={hypothesis.id} hypothesis={hypothesis} copy={t.model.hypotheses[hypothesis.id]} t={t} />)}</div>
      </section>

      <section className="model-section">
        <div className="section-heading"><p className="eyebrow">Салыстыру</p><h2>Модельдердің нәтижесі</h2></div>
        <p className="model-note">{t.model.comparisonNote}</p>
        <div className="model-comparison">{Object.entries(collapseModels).map(([key, result]) => <div className={key === "baseline_age" ? "model-bar is-baseline" : "model-bar"} key={key}><div className="model-bar-label"><span>{modelName(key)}</span><b>{result.roc_auc.toFixed(3)}</b></div><div className="model-bar-track"><i style={{ width: `${(result.roc_auc / maxAuc) * 100}%` }} /></div><div className="model-metrics"><span>{t.model.prAuc}: {result.pr_auc.toFixed(3)}</span><span>{t.model.brier}: {result.brier.toFixed(3)}</span></div></div>)}</div>
      </section>

      <section className="model-limits">
        <p className="eyebrow">Ғылыми сақтық</p>
        <h2>Модель нені істей алмайды</h2>
        <p>Бұл нәтиже тарихи себепті дәлелдемейді және болашақты абсолюттік түрде болжамайды. Индекс берілген деректер мен таңдалған айнымалылар шегінде салыстыру үшін қолданылады.</p>
      </section>
    </section>
  );
}

function CoefficientRow({ item }) {
  const coefficient = axisPosition(item.coef_std);
  const left = axisPosition(item.ci95[0]);
  const right = axisPosition(item.ci95[1]);
  return (
    <div className="coefficient-row">
      <div className="coefficient-label" title={item.label_kz}>{item.label_kz}</div>
      <div className="coefficient-track">
        <span className="zero-line" />
        <span className="confidence-line" style={{ left, width: `calc(${right} - ${left})` }} />
        <span className={item.coef_std >= 0 ? "coefficient-dot is-positive" : "coefficient-dot"} style={{ left: coefficient }} title={`Коэффициент: ${item.coef_std}`} />
      </div>
      <b className="coefficient-value">{item.coef_std.toFixed(3)}</b>
    </div>
  );
}

function HypothesisCard({ hypothesis, copy, t }) {
  const confirmed = hypothesis.evidence.filter((item) => item.ci_excludes_zero).length;
  const status = hypothesis.status === "ішінара расталды" ? t.model.partialStatus : hypothesis.status === "бағыты сәйкес, бірақ статистикалық дәлел әлсіз" ? t.model.weakStatus : hypothesis.status === "расталды" ? t.model.confirmedStatus : t.model.rejectedStatus;
  return (
    <article className="hypothesis-card">
      <div className="hypothesis-top"><strong>{hypothesis.id}</strong><span className={`hypothesis-status ${confirmed ? "is-partial" : "is-weak"}`} title={hypothesis.status === "бағыты сәйкес, бірақ статистикалық дәлел әлсіз" ? t.model.weakHint : undefined}>{status}</span></div>
      <p className="hypothesis-author">{copy.author}</p>
      <p>{copy.text}</p>
      <div className="hypothesis-evidence">{hypothesis.evidence.map((item) => <span key={item.key} className={item.direction_as_expected ? "evidence-positive" : "evidence-negative"}>{item.direction_as_expected ? "↗" : "↘"} {item.label_kz.split(":")[0]}</span>)}</div>
    </article>
  );
}
