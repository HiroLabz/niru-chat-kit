import { lazy, Suspense, type ComponentType } from "react";
import { useParams } from "react-router-dom";
import { Code } from "../components/Code";
import { Example } from "../components/Example";
import { PropsTables } from "../components/PropsTable";
import { PageHeader, Section } from "../components/Section";
import { BLOCKS, PRIMITIVES } from "../site/nav-data";
import { usePageTitle } from "../site/use-page-title";
import { NotFound } from "./NotFound";
import type { ComponentDoc } from "./docs/types";

type Group = "primitives" | "blocks";

function DocPage({ title, doc }: { title: string; doc: ComponentDoc }) {
  usePageTitle(title);
  return (
    <>
      <PageHeader title={title} lead={doc.summary} />
      <Code code={doc.imports} />
      <Section title="Examples">
        {doc.examples.map((def) => (
          <Example key={def.title} def={def} />
        ))}
        {doc.notes ? <Notes notes={doc.notes} /> : null}
      </Section>
      <Section title="API">
        <PropsTables api={doc.api} />
      </Section>
    </>
  );
}

function Notes({ notes }: { notes: ComponentDoc["notes"] }) {
  return (
    <div style={{ marginTop: 24, maxWidth: 720, lineHeight: 1.7 }} role="note">
      {notes}
    </div>
  );
}

const LOADERS: Record<Group, () => Promise<{ default: ComponentType<{ slug: string }> }>> = {
  primitives: async () => {
    const { PRIMITIVE_DOCS } = await import("./docs/primitives");
    return { default: ({ slug }) => <Resolved docs={PRIMITIVE_DOCS} list={PRIMITIVES} slug={slug} /> };
  },
  blocks: async () => {
    const { BLOCK_DOCS } = await import("./docs/blocks");
    return { default: ({ slug }) => <Resolved docs={BLOCK_DOCS} list={BLOCKS} slug={slug} /> };
  },
};

const LAZY = { primitives: lazy(LOADERS.primitives), blocks: lazy(LOADERS.blocks) };

function Resolved({ docs, list, slug }: { docs: Record<string, ComponentDoc>; list: readonly (readonly [string, string])[]; slug: string }) {
  const entry = list.find(([id]) => id === slug);
  const doc = docs[slug];
  if (!entry || !doc) return <NotFound />;
  return <DocPage title={entry[1]} doc={doc} />;
}

/** One page per primitive and block, drawn from the doc definitions next to each example file. */
export default function ComponentRoute({ group }: { group: Group }) {
  const { slug = "" } = useParams();
  const Page = LAZY[group];
  return (
    <Suspense fallback={null}>
      <Page slug={slug} />
    </Suspense>
  );
}
