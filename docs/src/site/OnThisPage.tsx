import { useEffect, useState } from "react";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";

type Entry = { id: string; text: string };

/** A contents list built from the page's `h2` elements; each entry scrolls to its section. */
export function OnThisPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  useEffect(() => {
    // The page may still be loading when this mounts; look again shortly.
    const read = () =>
      setEntries(
        Array.from(document.querySelectorAll<HTMLElement>("main h2[id]")).map((heading) => ({ id: heading.id, text: heading.textContent ?? "" }))
      );
    read();
    const timer = window.setTimeout(read, 600);
    return () => window.clearTimeout(timer);
  }, []);
  if (entries.length < 2) return null;
  return (
    <>
      <Typography variant="overline" color="text.secondary" component="h2" sx={{ display: "block" }}>
        On this page
      </Typography>
      <Typography component="ul" sx={{ listStyle: "none", m: 0, p: 0, fontSize: 14 }}>
        {entries.map((entry) => (
          <li key={entry.id}>
            <Link
              component="button"
              type="button"
              underline="hover"
              color="text.secondary"
              onClick={() => document.getElementById(entry.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
              sx={{ py: 0.5, textAlign: "left", fontSize: "inherit" }}
            >
              {entry.text}
            </Link>
          </li>
        ))}
      </Typography>
    </>
  );
}
