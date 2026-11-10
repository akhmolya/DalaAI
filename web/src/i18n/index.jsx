import { createContext, useContext } from "react";
import kz from "./kz.js";

const LangContext = createContext(kz);

export function LangProvider({ children }) {
  return <LangContext.Provider value={kz}>{children}</LangContext.Provider>;
}

export function useT() {
  return useContext(LangContext);
}
