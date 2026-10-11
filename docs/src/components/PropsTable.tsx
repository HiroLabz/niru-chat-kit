import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import props from "../generated/props.json";
import { COMMON_PROP_COPY, COMPONENT_COPY, DEFAULT_COPY, PROP_COPY } from "../pages/docs/prop-copy";
import { SITE_MONO } from "../site/theme";
import { C } from "./Section";

type Prop = { name: string; type: string; required: boolean; description: string; default: string | null };
type Entry = { description: string; props: Prop[]; source: string };
const DATA = props as unknown as Record<string, Entry>;

/** `Name` or `[ExportName, "Dotted.Label"]`: compound parts are exported flat but used with a dot. */
export type ApiRef = string | [string, string];

const mono = { fontFamily: SITE_MONO, fontSize: 13 } as const;

function PropsOf({ exportName, label }: { exportName: string; label: string }) {
  const entry = DATA[exportName];
  if (!entry) {
    return (
      <Typography color="error" role="alert">
        No props found for {exportName}. Run pnpm gen in the docs folder to regenerate them.
      </Typography>
    );
  }
  const summary = COMPONENT_COPY[exportName] ?? entry.description.split("\n\n")[0].replace(/\n/g, " ");
  const rows = entry.props.filter((prop) => !prop.name.startsWith("aria-") || prop.name === "aria-label");
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h3" component="h3" sx={{ fontFamily: SITE_MONO }}>{`<${label} />`}</Typography>
      {summary ? (
        <Typography color="text.secondary" sx={{ mt: 0.5, mb: 1, maxWidth: 720 }}>
          {summary}
        </Typography>
      ) : null}
      {rows.length === 0 ? (
        <Typography color="text.secondary">Takes no props.</Typography>
      ) : (
        <Box sx={{ overflowX: "auto", border: 1, borderColor: "divider", borderRadius: 1.5 }}>
          <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", "& th, & td": { textAlign: "left", verticalAlign: "top", p: 1.25, borderBottom: 1, borderColor: "divider" }, "& tr:last-child td": { borderBottom: 0 } }}>
            <caption style={{ position: "absolute", left: -9999 }}>{`Props of ${label}`}</caption>
            <thead>
              <tr>
                <Box component="th" scope="col" sx={{ width: 160 }}>Prop</Box>
                <Box component="th" scope="col">Type</Box>
                <Box component="th" scope="col" sx={{ width: 130 }}>Default</Box>
                <Box component="th" scope="col">Description</Box>
              </tr>
            </thead>
            <tbody>
              {rows.map((prop) => (
                <tr key={prop.name}>
                  <Box component="td" sx={{ ...mono, fontWeight: 600 }}>
                    {prop.name}
                    {prop.required ? <Box component="span" aria-label="required" title="required" sx={{ color: "error.main" }}>*</Box> : null}
                  </Box>
                  <Box component="td" sx={{ ...mono, color: "text.secondary", wordBreak: "break-word", minWidth: 160 }}>{prop.type}</Box>
                  <Box component="td" sx={{ ...mono, color: "text.secondary", wordBreak: "break-word" }}>{DEFAULT_COPY[`${exportName}.${prop.name}`] ?? prop.default ?? "-"}</Box>
                  <Box component="td" sx={{ fontSize: 14, lineHeight: 1.5 }}>{PROP_COPY[exportName]?.[prop.name] ?? COMMON_PROP_COPY[prop.name] ?? (prop.description.replace(/\n/g, " ") || "")}</Box>
                </tr>
              ))}
            </tbody>
          </Box>
        </Box>
      )}
    </Box>
  );
}

/** Props tables, one per exported part, read from the kit's TypeScript source at build time. */
export function PropsTables({ api }: { api: ApiRef[] }) {
  return (
    <>
      <Typography sx={{ color: "text.secondary", mb: 1 }}>
        A <C>*</C> after a name marks a prop you must set. Most components also take <C>sx</C> and <C>className</C> for styling.
      </Typography>
      {api.map((ref) => {
        const [exportName, label] = Array.isArray(ref) ? ref : [ref, ref];
        return <PropsOf key={exportName} exportName={exportName} label={label} />;
      })}
    </>
  );
}
