import type { ReactNode } from "react";
import type { ExampleDef } from "../../components/Example";
import type { ApiRef } from "../../components/PropsTable";

export type ComponentDoc = {
  /** One or two sentences under the title. */
  summary: ReactNode;
  /** The import line shown above the examples. */
  imports: string;
  /** Exported parts whose props tables are shown. */
  api: ApiRef[];
  examples: ExampleDef[];
  /** Extra prose after the examples (accessibility, behaviour notes). */
  notes?: ReactNode;
};
