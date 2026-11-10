// Логистикалық регрессияны браузерде есептеу.
// Формула Python-дағымен бірдей: p = 1 / (1 + e^-(b0 + Σ w_i * (x_i - mean_i) / sd_i))
// model — public/data/model.json мазмұны

export function predictRisk(model, values) {
  let z = model.intercept;
  const contributions = model.features.map((f) => {
    const x = values[f.key] ?? f.default;
    const c = (f.weight * (x - f.mean)) / f.sd; // осы белгінің логитке үлесі
    z += c;
    return { key: f.key, label_kz: f.label_kz, label_ru: f.label_ru, label_en: f.label_en, value: x, contribution: c };
  });
  const p = 1 / (1 + Math.exp(-z));
  contributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  return { p, z, contributions };
}

// Тәуекел деңгейі салыстырмалы индекс ретінде түсіндіріледі.
export function riskLevel(p) {
  if (p < 0.3) return { id: "low", kz: "Төмен", ru: "Низкий", en: "Low", color: "#2E7D32" };
  if (p < 0.55) return { id: "mid", kz: "Орташа", ru: "Средний", en: "Medium", color: "#F9A825" };
  if (p < 0.75) return { id: "high", kz: "Жоғары", ru: "Высокий", en: "High", color: "#EF6C00" };
  return { id: "crit", kz: "Өте жоғары", ru: "Очень высокий", en: "Critical", color: "#C62828" };
}

// Мемлекеттің нақты терезесін симуляторға «пресет» ретінде алу
export function windowToValues(polity, window) {
  return {
    ...window.features,
    ...polity.static,
  };
}

export function formatYear(y, lang = "kz") {
  if (y < 0) return lang === "en" ? `${-y} BCE` : lang === "ru" ? `${-y} до н.э.` : `б.з.д. ${-y}`;
  return String(y);
}
