import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { DataProvider } from "./lib/data.jsx";
import { LangProvider } from "./i18n/index.jsx";
import App from "./App.jsx";
import "./styles.css";

// HashRouter — GitHub Pages-те беттерді жаңартқанда 404 болмауы үшін
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LangProvider>
      <DataProvider>
        <HashRouter>
          <App />
        </HashRouter>
      </DataProvider>
    </LangProvider>
  </React.StrictMode>
);
