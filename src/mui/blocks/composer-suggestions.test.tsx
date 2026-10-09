import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ComposerSuggestionsList, filterSuggestions, useComposerSuggestions } from "./composer-suggestions";

describe("filterSuggestions", () => {
  const suggestions = [
    "Summarize this document",
    "Summarize in bullet points",
    "Translate to Spanish",
    "Translate to French",
    "Translate to German",
    "Explain summarization",
  ];

  it("returns nothing for an empty or whitespace-only query", () => {
    expect(filterSuggestions(suggestions, "")).toEqual([]);
    expect(filterSuggestions(suggestions, "   ")).toEqual([]);
  });

  it("matches case-insensitively on substring containment", () => {
    expect(filterSuggestions(suggestions, "TRANSLATE")).toEqual([
      "Translate to Spanish",
      "Translate to French",
      "Translate to German",
    ]);
  });

  it("excludes an exact match (case-insensitive) of the query itself", () => {
    const pool = ["cat", "category", "catalog", "concatenate"];
    expect(filterSuggestions(pool, "cat")).toEqual(["category", "catalog", "concatenate"]);
    expect(filterSuggestions(pool, "CAT")).toEqual(["category", "catalog", "concatenate"]);
  });

  it("caps results at 4 by default", () => {
    const many = ["cat1", "cat2", "cat3", "cat4", "cat5", "cat6"];
    expect(filterSuggestions(many, "cat")).toEqual(["cat1", "cat2", "cat3", "cat4"]);
  });

  it("honours a custom limit", () => {
    expect(filterSuggestions(suggestions, "summar", 1)).toEqual(["Summarize this document"]);
  });
});

/**
 * prompt-kit's own autocomplete block (`PromptAutocompleteHighlight`) renders its
 * matches one per line, full width, left-aligned — not a wrapped row of pills. This
 * list reuses `PromptSuggestion`'s `"row"` shape (the default once `highlight` is
 * passed, which it always is here) laid out in a column, so arrow-key order lines up
 * with reading order regardless of how many items are showing.
 */
describe("ComposerSuggestionsList", () => {
  function Harness({ value, suggestions }: { value: string; suggestions: string[] }) {
    const controller = useComposerSuggestions({ value, suggestions, onFill: () => {} });
    return <ComposerSuggestionsList controller={controller} />;
  }

  it("stacks suggestions in a column of full-width rows, not wrapped pills", () => {
    render(
      <Harness
        value="translate"
        suggestions={["Translate to Spanish", "Translate to French"]}
      />
    );

    const listbox = screen.getByRole("listbox", { name: "Prompt suggestions" });
    expect(listbox).toHaveStyle({ flexDirection: "column" });

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(2);
    for (const option of options) {
      expect(option.querySelector(".MuiChip-root")).toBeNull();
      expect(option.querySelector("button")).not.toBeNull();
    }
  });

  /**
   * Live-check regression: typing "help" rendered the matching suggestion as
   * "What can youhelpme with?" — the spaces either side of the highlighted match
   * were lost. Exercised here through the real controller (not `PromptSuggestion`
   * directly), the same path the composer's autocomplete dropdown uses.
   */
  it("keeps every space of a suggestion whose match sits in the middle of the label", () => {
    const label = "What can you help me with?";
    render(<Harness value="help" suggestions={[label]} />);

    const option = screen.getByRole("option");
    expect(option.textContent).toBe(label);
  });
});
