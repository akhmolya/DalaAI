# Дала мемлекеттері AI

Еуразия көшпелі мемлекеттерінің ыдырауын тарихи айнымалылар негізінде ML-модель арқылы болжау.

```
dala-ml/
├── ml/                         # Python: модельді оқыту
│   ├── data/
│   │   ├── koshpeli_memleketter_derekqor.csv   # 104 терезе × белгілер
│   │   └── polities.csv                        # 21 мемлекет туралы мәлімет
│   ├── train_model.py          # оқыту + тексеру + JSON экспорт + графиктер
│   ├── requirements.txt
│   ├── export/                 # (автоматты) сайтқа арналған JSON
│   └── figures/                # (автоматты) жұмысқа арналған графиктер
└── web/                        # React (Vite) сайты
    ├── public/data/            # (автоматты) train_model.py осында көшіреді
    ├── scripts/check-model.mjs # JS формуласы Python-мен сәйкес пе — тексеру
    └── src/
        ├── lib/model.js        # браузерде тәуекелді есептеу
        ├── lib/data.jsx        # JSON жүктеу (DataProvider, useData)
        ├── components/Simulator.jsx
        ├── components/RiskTimeline.jsx
        └── App.jsx             # беттер мен маршруттар (қаңқа)
```

## 1. Модельді оқыту

```bash
cd ml
pip install -r requirements.txt
python train_model.py
```

Google Colab-та: `ml` папкасын жүктеп, `!pip install lifelines`, сосын `!python train_model.py`.

Деректерді өзгерткен сайын (мысалы, мұғаліммен тексергеннен кейін) скриптті қайта іске қосыңыз:
JSON-дар `web/public/data/` ішіне өздігінен көшіріледі.

## 2. Сайт

```bash
cd web
npm install
npm run check-model   # браузердегі модель = Python моделі
npm run dev           # http://localhost:5173
npm run build         # dist/ — GitHub Pages / Vercel / Netlify-ға жүктеу
```

## Python ↔ React байланысы

Сервер жоқ. Python модельді оқиды да, оны JSON-ға «қатырады»:

| Файл | Мазмұны | Қай бетте |
|---|---|---|
| `model.json` | логистикалық регрессия: intercept, әр белгінің mean/sd/weight, слайдер шектері, 3 тілдегі атаулар | Симулятор |
| `polities.json` | мемлекеттер, терезелер, оқиғалар, әр терезенің тәуекелі (`risk_oof`, `risk_fit`), негізгі себептер | Мемлекеттер, карта, уақыт сызығы |
| `importance.json` | коэффициенттер, 95% бутстрэп интервалы, Random Forest маңыздылығы | Модель не дейді |
| `hypotheses.json` | H1–H4 және олардың статусы | Модель не дейді |
| `metrics.json` | барлық модельдердің ROC-AUC, PR-AUC, Brier | Әдістеме |
| `cox.json` | Cox моделінің hazard ratio мәндері | Әдістеме |

Браузер `p = 1 / (1 + e^-(b0 + Σ wᵢ·(xᵢ − meanᵢ)/sdᵢ))` формуласымен есептейді — бұл sklearn нәтижесімен дәл сәйкес келеді
(`npm run check-model` тексереді).

`risk_oof` — әділ болжам: модель осы мемлекетті оқу кезінде көрмеген (Leave-One-Polity-Out).
Сайттағы графиктерде осы мәнді көрсетіңіз. `risk_fit` — толық модельдің мәні, тек симулятормен салыстыру үшін.
