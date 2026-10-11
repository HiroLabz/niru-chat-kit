import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { App } from "./App";
import { ModeProvider } from "./site/mode";

// A hash router keeps every route working on any static host and under any base path:
// the server only ever serves index.html.
createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <ModeProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </ModeProvider>
  </StrictMode>
);
