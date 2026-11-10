// Тексеру: браузердегі формула Python моделімен бірдей нәтиже бере ме?
// Іске қосу: npm run check-model
import { readFileSync } from "node:fs";
import { predictRisk } from "../src/lib/model.js";

const model = JSON.parse(readFileSync(new URL("../public/data/model.json", import.meta.url)));
const polities = JSON.parse(readFileSync(new URL("../public/data/polities.json", import.meta.url)));

let maxDiff = 0, n = 0;
for (const pol of polities) {
  for (const w of pol.windows) {
    const { p } = predictRisk(model, { ...w.features, ...pol.static });
    maxDiff = Math.max(maxDiff, Math.abs(p - w.risk_fit));
    n++;
  }
}
console.log(`${n} терезе тексерілді, ең үлкен айырма: ${maxDiff.toFixed(4)}`);
if (maxDiff > 0.002) { console.error("ҚАТЕ: JS және Python модельдері сәйкес емес"); process.exit(1); }
console.log("OK: модель браузерде дұрыс есептеледі");
