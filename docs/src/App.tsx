import { lazy, Suspense } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import { Route, Routes } from "react-router-dom";
import { Shell } from "./site/Shell";
import { NotFound } from "./pages/NotFound";

const Introduction = lazy(() => import("./pages/Introduction"));
const Installation = lazy(() => import("./pages/Installation"));
const Theming = lazy(() => import("./pages/Theming"));
const CoreOverview = lazy(() => import("./pages/CoreOverview"));
const CoreFrames = lazy(() => import("./pages/CoreFrames"));
const CoreTransport = lazy(() => import("./pages/CoreTransport"));
const JsxSafety = lazy(() => import("./pages/JsxSafety"));
const DemoPage = lazy(() => import("./demo/DemoPage"));
const ComponentRoute = lazy(() => import("./pages/ComponentRoute"));

function Loading() {
  return (
    <Box role="status" aria-label="Loading" sx={{ display: "grid", placeItems: "center", minHeight: 240 }}>
      <CircularProgress size={28} />
    </Box>
  );
}

/** Every route. The demo is full screen and sits outside the docs shell. */
export function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/demo" element={<DemoPage />} />
        <Route element={<Shell />}>
          <Route index element={<Introduction />} />
          <Route path="installation" element={<Installation />} />
          <Route path="theming" element={<Theming />} />
          <Route path="core" element={<CoreOverview />} />
          <Route path="core/frames" element={<CoreFrames />} />
          <Route path="core/transport" element={<CoreTransport />} />
          <Route path="primitives/:slug" element={<ComponentRoute group="primitives" />} />
          <Route path="blocks/:slug" element={<ComponentRoute group="blocks" />} />
          <Route path="jsx-safety" element={<JsxSafety />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
