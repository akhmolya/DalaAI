// Python экспорттаған JSON-дарды жүктеу (public/data/*.json).
// Сервер қажет емес: сайт статикалық, GitHub Pages / Vercel / Netlify-да жұмыс істейді.
import { createContext, useContext, useEffect, useState } from "react";

const FILES = ["model", "polities", "importance", "metrics", "hypotheses", "cox"];
const base = import.meta.env.BASE_URL; // GitHub Pages-те ішкі жолды дұрыс береді

export async function loadAll() {
  const entries = await Promise.all(
    FILES.map(async (name) => {
      const res = await fetch(`${base}data/${name}.json`);
      if (!res.ok) return [name, null]; // cox.json міндетті емес
      return [name, await res.json()];
    })
  );
  return Object.fromEntries(entries);
}

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  useEffect(() => {
    loadAll()
      .then((data) => setState({ loading: false, error: null, data }))
      .catch((error) => setState({ loading: false, error, data: null }));
  }, []);
  return <DataContext.Provider value={state}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData() DataProvider ішінде қолданылуы тиіс");
  return ctx;
}
