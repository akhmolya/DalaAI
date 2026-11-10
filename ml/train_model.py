# -*- coding: utf-8 -*-
"""
Еуразия көшпелі мемлекеттерінің ыдырауын болжау — модельді оқыту.

Іске қосу (жергілікті немесе Google Colab):
    pip install pandas numpy scikit-learn matplotlib lifelines
    python train_model.py

Нәтиже:
    export/*.json   -> React сайтының public/data/ папкасына көшіріледі
    figures/*.png   -> ғылыми жұмыс пен презентацияға арналған графиктер
"""
import json
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
from sklearn.model_selection import LeaveOneGroupOut
from sklearn.metrics import roc_auc_score, brier_score_loss, average_precision_score
from sklearn.inspection import permutation_importance

warnings.filterwarnings("ignore")
RNG = 42
ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
EXPORT = ROOT / "export"
FIG = ROOT / "figures"
EXPORT.mkdir(exist_ok=True)
FIG.mkdir(exist_ok=True)

# ---------------------------------------------------------------------------
# 1. Белгілердің сипаттамасы (сайттағы слайдерлер де осыдан құрылады)
# ---------------------------------------------------------------------------
FEATURES = [
    # key, kz, ru, en, min, max, step, group
    ("age_at_start", "Мемлекеттің жасы (жыл)", "Возраст государства (лет)", "State age (years)", 0, 350, 5, "time"),
    ("n_rulers", "Билеушілер саны (25 жылда)", "Число правителей за 25 лет", "Rulers per 25 years", 1, 10, 1, "political"),
    ("long_ruler_death", "Ұзақ билеген билеушінің өлімі", "Смерть долго правившего правителя", "Death of a long-reigning ruler", 0, 1, 1, "political"),
    ("succession_conflict", "Тақ таласы (0–2)", "Борьба за престол (0–2)", "Succession conflict (0–2)", 0, 2, 1, "political"),
    ("major_defeat", "Ірі сыртқы жеңіліс", "Крупное внешнее поражение", "Major external defeat", 0, 1, 1, "military"),
    ("rival_rise", "Бәсекелестің күшеюі", "Усиление соперника", "Rise of a rival", 0, 1, 1, "military"),
    ("neighbor_strength", "Отырықшы көршінің күші (0–2)", "Сила оседлого соседа (0–2)", "Sedentary neighbour strength (0–2)", 0, 2, 1, "external"),
    ("external_resources", "Сыртқы ресурстар (0–2)", "Внешние ресурсы (0–2)", "External resources (0–2)", 0, 2, 1, "economic"),
    ("territory_trend", "Аумақ өзгерісі (−1/0/+1)", "Изменение территории (−1/0/+1)", "Territory trend (−1/0/+1)", -1, 1, 1, "territory"),
    ("disaster", "Жұт, ашаршылық, індет", "Джут, голод, эпидемия", "Dzud, famine, epidemic", 0, 1, 1, "ecology"),
    ("religion_change", "Дінді ауыстыру", "Смена религии", "Religious change", 0, 1, 1, "culture"),
    ("succession_system", "Мұрагерлік жүйесі: 0 әкеден балаға, 1 аралас, 2 ағадан ініге", "Наследование: 0 отец→сын, 1 смешанное, 2 брат→брат", "Succession: 0 lineal, 1 mixed, 2 lateral", 0, 2, 1, "ethnography"),
    ("appanage_system", "Ұлыстық (үлестік) жүйе", "Удельная (улусная) система", "Appanage (ulus) system", 0, 1, 1, "ethnography"),
    ("sedentarization", "Отырықшылану деңгейі (0–2)", "Степень оседлости (0–2)", "Sedentarization (0–2)", 0, 2, 1, "ethnography"),
]
FEAT = [f[0] for f in FEATURES]
# Абляция: аумақ трендін алып тастау (ол ыдырау анықтамасына жақын)
FEAT_NO_TERR = [f for f in FEAT if f != "territory_trend"]

TARGETS = {
    "collapse": "Келесі сәтте ыдырау (терезе ыдыраумен аяқталады)",
    "crisis_next": "Келесі 25 жылда азамат соғысы немесе ыдырау",
}

# ---------------------------------------------------------------------------
# 2. Деректерді жүктеу
# ---------------------------------------------------------------------------
df = pd.read_csv(DATA / "koshpeli_memleketter_derekqor.csv", encoding="utf-8-sig")
pol = pd.read_csv(DATA / "polities.csv", encoding="utf-8-sig")
groups = df["polity_id"].values
print(f"Жолдар: {len(df)}, мемлекеттер: {df.polity_id.nunique()}, ыдыраулар: {df.collapse.sum()}")


# ---------------------------------------------------------------------------
# 3. Модельдер
# ---------------------------------------------------------------------------
def make_models():
    return {
        # Негізгі модель: түсіндірілетін, сайтта браузерде есептеледі
        "logreg": make_pipeline(StandardScaler(),
                                LogisticRegression(C=0.3, class_weight="balanced", max_iter=5000)),
        "random_forest": RandomForestClassifier(n_estimators=500, max_depth=4, min_samples_leaf=3,
                                                class_weight="balanced", random_state=RNG),
        "gboost": GradientBoostingClassifier(n_estimators=150, max_depth=2, learning_rate=0.05,
                                             subsample=0.8, random_state=RNG),
    }


def logo_predict(model, X, y):
    """Leave-One-Polity-Out: модель бір мемлекетті көрмей оқиды да, соны болжайды."""
    oof = np.zeros(len(y))
    for tr, te in LeaveOneGroupOut().split(X, y, groups):
        if y[tr].sum() == 0:
            oof[te] = 0
            continue
        m = model
        m.fit(X[tr], y[tr])
        oof[te] = m.predict_proba(X[te])[:, 1]
    return oof


def metrics(y, p):
    return {
        "roc_auc": round(float(roc_auc_score(y, p)), 3),
        "pr_auc": round(float(average_precision_score(y, p)), 3),
        "brier": round(float(brier_score_loss(y, np.clip(p, 0, 1))), 3),
        "positives": int(y.sum()), "n": int(len(y)),
    }


results = {}
oof_store = {}
for target in TARGETS:
    y = df[target].values
    results[target] = {}
    # Базалық модель: тек жас (Ибн Хальдун)
    base = logo_predict(make_pipeline(StandardScaler(), LogisticRegression()), df[["age_at_start"]].values, y)
    results[target]["baseline_age"] = metrics(y, base)
    for name, model in make_models().items():
        for fs_name, fs in [("all", FEAT), ("no_territory", FEAT_NO_TERR)]:
            p = logo_predict(model, df[fs].values, y)
            key = f"{name}__{fs_name}"
            results[target][key] = metrics(y, p)
            oof_store[(target, key)] = p

print("\n=== LOGO нәтижелері ===")
for t, r in results.items():
    print(f"\n[{t}]")
    for k, v in r.items():
        print(f"  {k:28s} AUC={v['roc_auc']:.3f}  PR-AUC={v['pr_auc']:.3f}  Brier={v['brier']:.3f}")

# ---------------------------------------------------------------------------
# 4. Соңғы логистикалық модель (барлық деректерде) -> сайтқа экспорт
# ---------------------------------------------------------------------------
y = df["collapse"].values
final = make_models()["logreg"].fit(df[FEAT].values, y)
scaler, lr = final.named_steps["standardscaler"], final.named_steps["logisticregression"]
coef_std = lr.coef_[0]

# Кластерлік бутстрэп (мемлекеттер бойынша) — коэффициенттердің 95% интервалы
B = 1000
rng = np.random.default_rng(RNG)
ids = df.polity_id.unique()
boot = []
for _ in range(B):
    pick = rng.choice(ids, size=len(ids), replace=True)
    sub = pd.concat([df[df.polity_id == i] for i in pick])
    if sub.collapse.nunique() < 2:
        continue
    m = make_models()["logreg"].fit(sub[FEAT].values, sub.collapse.values)
    boot.append(m.named_steps["logisticregression"].coef_[0])
boot = np.array(boot)
ci_lo, ci_hi = np.percentile(boot, [2.5, 97.5], axis=0)
p_pos = (boot > 0).mean(axis=0)

# Random forest — пермутациялық маңыздылық (салыстыру үшін)
rf = make_models()["random_forest"].fit(df[FEAT].values, y)
perm = permutation_importance(rf, df[FEAT].values, y, scoring="roc_auc", n_repeats=50, random_state=RNG)

importance = []
for i, f in enumerate(FEATURES):
    importance.append({
        "key": f[0], "label_kz": f[1], "label_ru": f[2], "label_en": f[3], "group": f[7],
        "coef_std": round(float(coef_std[i]), 3),            # стандартталған коэффициент
        "odds_ratio_per_sd": round(float(np.exp(coef_std[i])), 3),
        "ci95": [round(float(ci_lo[i]), 3), round(float(ci_hi[i]), 3)],
        "share_bootstrap_positive": round(float(p_pos[i]), 3),
        "rf_permutation": round(float(perm.importances_mean[i]), 4),
    })
importance.sort(key=lambda d: -abs(d["coef_std"]))

# Браузерде есептеу үшін модель: p = sigmoid(b0 + Σ w_i * (x_i - mean_i)/sd_i)
model_json = {
    "type": "logistic_regression",
    "target": "collapse",
    "target_kz": TARGETS["collapse"],
    "window_years": 25,
    "intercept": round(float(lr.intercept_[0]), 6),
    "class_weight": "balanced",
    "note_kz": "class_weight=balanced болғандықтан ықтималдық абсолюттік мән емес, салыстырмалы тәуекел индексі ретінде түсіндіріледі.",
    "features": [
        {"key": f[0], "label_kz": f[1], "label_ru": f[2], "label_en": f[3],
         "min": f[4], "max": f[5], "step": f[6], "group": f[7],
         "mean": round(float(scaler.mean_[i]), 6), "sd": round(float(scaler.scale_[i]), 6),
         "weight": round(float(coef_std[i]), 6),
         "default": round(float(np.median(df[f[0]])), 2)}
        for i, f in enumerate(FEATURES)
    ],
}

# Тексеру: JSON-формула sklearn нәтижесімен бірдей болуы тиіс
def js_like_predict(row):
    z = model_json["intercept"] + sum(ft["weight"] * (row[ft["key"]] - ft["mean"]) / ft["sd"]
                                      for ft in model_json["features"])
    return 1 / (1 + np.exp(-z))
chk = np.array([js_like_predict(r) for _, r in df.iterrows()])
assert np.allclose(chk, final.predict_proba(df[FEAT].values)[:, 1], atol=1e-4), "JSON модель сәйкес емес!"

# ---------------------------------------------------------------------------
# 5. Гипотезаларды тексеру
# ---------------------------------------------------------------------------
imp = {d["key"]: d for d in importance}
def verdict(keys, expected_sign):
    out = []
    for k in keys:
        d = imp[k]
        sign_ok = np.sign(d["coef_std"]) == expected_sign
        strong = (d["ci95"][0] > 0) if expected_sign > 0 else (d["ci95"][1] < 0)
        out.append({"key": k, "label_kz": d["label_kz"], "coef_std": d["coef_std"], "ci95": d["ci95"],
                    "direction_as_expected": bool(sign_ok), "ci_excludes_zero": bool(strong)})
    return out

hypotheses = [
    {"id": "H1", "author": "Ибн Хальдун",
     "text_kz": "Әулет қартайған сайын ыдырау тәуекелі өседі.",
     "evidence": verdict(["age_at_start"], +1)},
    {"id": "H2", "author": "Т. Барфилд",
     "text_kz": "Көшпелі империя отырықшы көршіден ресурс ағыны тоқтағанда әлсірейді.",
     "evidence": verdict(["external_resources"], -1) + verdict(["neighbor_strength"], +1)},
    {"id": "H3", "author": "Этнографиялық гипотеза",
     "text_kz": "Тақ таласы, ұлыстық жүйе және жанама мұрагерлік тәуекелді арттырады.",
     "evidence": verdict(["succession_conflict", "appanage_system", "succession_system", "long_ruler_death"], +1)},
    {"id": "H4", "author": "Экологиялық гипотеза",
     "text_kz": "Жұт, ашаршылық және індет ыдырауды жақындатады.",
     "evidence": verdict(["disaster"], +1)},
]
for h in hypotheses:
    ok = [e["direction_as_expected"] for e in h["evidence"]]
    strong = [e["ci_excludes_zero"] for e in h["evidence"]]
    if any(strong):
        h["status"] = "расталды" if all(ok) else "ішінара расталды"
    elif sum(ok) > len(ok) / 2:
        h["status"] = "бағыты сәйкес, бірақ статистикалық дәлел әлсіз"
    else:
        h["status"] = "расталмады"

# ---------------------------------------------------------------------------
# 6. Өміршеңдік талдауы (Cox, уақытқа тәуелді белгілер)
# ---------------------------------------------------------------------------
cox_out = None
try:
    from lifelines import CoxTimeVaryingFitter
    cdf = df.copy()
    cdf["start"] = cdf["age_at_start"]
    cdf["stop"] = cdf["age_at_start"] + cdf["window_len"]
    cox_feats = ["succession_conflict", "rival_rise", "disaster", "external_resources",
                 "major_defeat", "neighbor_strength"]
    ctv = CoxTimeVaryingFitter(penalizer=0.1)
    ctv.fit(cdf[["polity_id", "start", "stop", "collapse"] + cox_feats],
            id_col="polity_id", event_col="collapse", start_col="start", stop_col="stop")
    s = ctv.summary
    cox_out = [{"key": k, "label_kz": next(f[1] for f in FEATURES if f[0] == k),
                "hazard_ratio": round(float(s.loc[k, "exp(coef)"]), 3),
                "ci95": [round(float(s.loc[k, "exp(coef) lower 95%"]), 3),
                         round(float(s.loc[k, "exp(coef) upper 95%"]), 3)],
                "p": round(float(s.loc[k, "p"]), 4)} for k in cox_feats]
    print("\n=== Cox моделі (hazard ratio) ===")
    print(s[["exp(coef)", "p"]].round(3))
except ImportError:
    print("lifelines орнатылмаған — Cox талдауы өткізілді")

# ---------------------------------------------------------------------------
# 7. Сайтқа арналған деректер
# ---------------------------------------------------------------------------
best_key = "logreg__all"
oof = oof_store[("collapse", best_key)]
full = final.predict_proba(df[FEAT].values)[:, 1]
X_std = (df[FEAT].values - scaler.mean_) / scaler.scale_
contrib = X_std * coef_std                      # әр белгінің логит-үлесі (сызықтық модельде дәл)

polities = []
for _, pr in pol.iterrows():
    sub = df[df.polity_id == pr.polity_id].sort_values("window_start")
    windows = []
    for idx, w in sub.iterrows():
        c = {FEAT[j]: round(float(contrib[idx, j]), 3) for j in range(len(FEAT))}
        top = sorted(c.items(), key=lambda kv: -kv[1])[:3]
        windows.append({
            "start": int(w.window_start), "end": int(w.window_end),
            "features": {k: (int(w[k]) if float(w[k]).is_integer() else float(w[k])) for k in FEAT},
            "collapse": int(w.collapse), "crisis_next": int(w.crisis_next),
            "risk_oof": round(float(oof[idx]), 3),        # әділ болжам: модель бұл мемлекетті көрмеген
            "risk_fit": round(float(full[idx]), 3),       # толық модель
            "top_drivers": [{"key": k, "contribution": v} for k, v in top if v > 0],
            "confidence": w.confidence, "key_events_kz": w.key_events,
        })
    polities.append({
        "id": pr.polity_id, "name_kz": pr.polity, "region_kz": pr.region,
        "founded": int(pr.founded), "collapse_year": int(pr.collapse_year),
        "lifespan": int(pr.collapse_year - pr.founded),
        "collapse_type_kz": pr.collapse_type, "collapse_desc_kz": pr.collapse_desc,
        "static": {k: int(sub.iloc[0][k]) for k in
                   ["succession_system", "appanage_system", "sedentarization", "own_script",
                    "written_law", "heterogeneity"]},
        "sources": pr.sources, "windows": windows,
    })

meta = {
    "n_rows": int(len(df)), "n_polities": int(df.polity_id.nunique()),
    "n_collapses": int(df.collapse.sum()), "validation": "Leave-One-Polity-Out",
    "best_model": best_key, "results": results,
}

def dump(name, obj):
    with open(EXPORT / name, "w", encoding="utf-8") as fh:
        json.dump(obj, fh, ensure_ascii=False, indent=1)

dump("model.json", model_json)
dump("importance.json", importance)
dump("metrics.json", meta)
dump("hypotheses.json", hypotheses)
dump("polities.json", polities)
if cox_out:
    dump("cox.json", cox_out)

# React сайты қатар тұрса — JSON-дарды бірден public/data/ ішіне көшіреміз
SITE_DATA = ROOT.parent / "web" / "public" / "data"
if (ROOT.parent / "web").exists():
    import shutil
    SITE_DATA.mkdir(parents=True, exist_ok=True)
    for f in EXPORT.glob("*.json"):
        shutil.copy(f, SITE_DATA / f.name)
    print("JSON сайтқа көшірілді:", SITE_DATA)

# ---------------------------------------------------------------------------
# 8. Графиктер (жұмыс пен презентация үшін)
# ---------------------------------------------------------------------------
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 10})

# 8.1 Коэффициенттер + 95% CI
fig, ax = plt.subplots(figsize=(8, 6))
order = importance[::-1]
yy = np.arange(len(order))
ax.errorbar([d["coef_std"] for d in order], yy,
            xerr=[[d["coef_std"] - d["ci95"][0] for d in order], [d["ci95"][1] - d["coef_std"] for d in order]],
            fmt="o", color="#1F4E78", ecolor="#9DB3CC", capsize=3)
ax.axvline(0, color="grey", lw=0.8)
ax.set_yticks(yy, [d["label_kz"].split(":")[0] for d in order])
ax.set_xlabel("Стандартталған коэффициент (оң → тәуекел өседі)")
ax.set_title("Ыдырау факторлары\n(логистикалық регрессия, 95% бутстрэп интервалы)")
fig.tight_layout(); fig.savefig(FIG / "coefficients.png", dpi=200); plt.close(fig)

# 8.2 Модельдерді салыстыру
r = results["collapse"]
keys = ["baseline_age", "logreg__all", "logreg__no_territory", "random_forest__all", "gboost__all"]
names = ["Тек жас", "Лог. регрессия", "Лог. регр. (аумақсыз)", "Random Forest", "Gradient Boosting"]
fig, ax = plt.subplots(figsize=(7, 4))
ax.bar(names, [r[k]["roc_auc"] for k in keys], color=["#BFBFBF"] + ["#1F4E78"] * 4)
ax.axhline(0.5, ls="--", color="grey", lw=0.8)
ax.set_ylim(0.4, 1); ax.set_ylabel("ROC-AUC (Leave-One-Polity-Out)")
ax.set_title("Модельдерді салыстыру")
plt.xticks(rotation=20, ha="right"); fig.tight_layout()
fig.savefig(FIG / "model_comparison.png", dpi=200); plt.close(fig)

# 8.3 Мемлекеттер бойынша тәуекел динамикасы
fig, axes = plt.subplots(7, 3, figsize=(13, 18), sharey=True)
for ax, p in zip(axes.flat, polities):
    xs = [w["end"] for w in p["windows"]]
    ax.plot(xs, [w["risk_oof"] for w in p["windows"]], "-o", color="#1F4E78", ms=3)
    ax.axvline(p["collapse_year"], color="#C00000", ls="--", lw=0.8)
    ax.set_title(p["name_kz"][:32], fontsize=9)
for ax in axes.flat[len(polities):]:
    ax.axis("off")
fig.suptitle("Ыдырау тәуекелі (LOGO болжамы); қызыл сызық — нақты ыдырау", y=0.995)
fig.tight_layout(); fig.savefig(FIG / "risk_by_polity.png", dpi=150); plt.close(fig)

print("\nЭкспорт дайын:", ", ".join(sorted(p.name for p in EXPORT.iterdir())))
print("Гипотезалар:", [(h["id"], h["status"]) for h in hypotheses])
