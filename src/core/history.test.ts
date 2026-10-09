import { describe, expect, it } from "vitest";
import {
  annotateFromHistory,
  readCitationCheck,
  resultFields,
  toChatMessages,
} from "./history";
import type { ChatMessage, StreamResultData } from "./types";
import type { MessageOut } from "./history";

function row(overrides: Partial<MessageOut>): MessageOut {
  return {
    id: "m1",
    conversation_id: "c1",
    role: "user",
    status: "completed",
    content: "hello",
    sibling_ids: [],
    sibling_index: 0,
    sibling_count: 1,
    livemode: false,
    created_at: "2026-09-28T00:00:00Z",
    ...overrides,
  };
}

const GROUNDED_FALSE = { grounded: false, required: true, kept: 0, dropped: ["3"], renumbered: false };

describe("toChatMessages", () => {
  it("carries status, citation check and branch position onto each turn", () => {
    const [question, reply] = toChatMessages([
      row({ id: "q1" }),
      row({
        id: "a2",
        role: "assistant",
        status: "stopped",
        content: "partial",
        citation_check: GROUNDED_FALSE,
        sibling_ids: ["a1", "a2", "a3"],
        sibling_index: 1,
        sibling_count: 3,
      }),
    ]);
    expect(question).toMatchObject({ id: "q1", serverId: "q1", siblingIds: ["q1"], siblingIndex: 0 });
    expect(reply).toMatchObject({
      id: "a2",
      serverId: "a2",
      status: "stopped",
      text: "partial",
      siblingIds: ["a1", "a2", "a3"],
      siblingIndex: 1,
      citationCheck: GROUNDED_FALSE,
    });
  });
});

describe("readCitationCheck", () => {
  it("ignores a shape it does not recognise", () => {
    expect(readCitationCheck(null)).toBeNull();
    expect(readCitationCheck({ grounded: "no" })).toBeNull();
    expect(readCitationCheck(GROUNDED_FALSE)).toEqual(GROUNDED_FALSE);
  });
});

describe("annotateFromHistory", () => {
  it("attaches server ids from the newest turn back, keeping the live ids", () => {
    const local: ChatMessage[] = [
      { id: "local-q", role: "user", text: "hi" },
      { id: "local-a", role: "assistant", text: "hello" },
    ];
    const annotated = annotateFromHistory(local, [
      row({ id: "old", role: "assistant" }),
      row({ id: "q", role: "user" }),
      row({ id: "a", role: "assistant", sibling_ids: ["a0", "a"], sibling_index: 1, sibling_count: 2 }),
    ]);
    expect(annotated.map((m) => [m.id, m.serverId])).toEqual([
      ["local-q", "q"],
      ["local-a", "a"],
    ]);
    expect(annotated[1].siblingIds).toEqual(["a0", "a"]);
  });

  it("stops at the first turn whose role disagrees", () => {
    const local: ChatMessage[] = [
      { id: "x", role: "assistant", text: "greeting" },
      { id: "y", role: "assistant", text: "answer" },
    ];
    const annotated = annotateFromHistory(local, [row({ id: "q" }), row({ id: "a", role: "assistant" })]);
    expect(annotated[0].serverId).toBeUndefined();
    expect(annotated[1].serverId).toBe("a");
  });
});

describe("resultFields", () => {
  const base: StreamResultData = { status: "completed", module: "chat", shaping_status: "none" };

  it("keeps the streamed text when the server did not correct it", () => {
    expect(resultFields({ ...base, message: "server text" }, "streamed").text).toBeUndefined();
  });

  it("takes the corrected message when a citation check ran", () => {
    const fields = resultFields(
      { ...base, message: "clean [1]", citation_check: GROUNDED_FALSE },
      "clean [1] [3]"
    );
    expect(fields.text).toBe("clean [1]");
    expect(fields.citationCheck?.grounded).toBe(false);
  });

  it("marks a stopped result and keeps its partial answer", () => {
    const fields = resultFields({ ...base, status: "stopped", message: "half an ans" }, "half an ans");
    expect(fields.status).toBe("stopped");
    expect(fields.text).toBe("half an ans");
  });
});

describe("stored generated files", () => {
  const ref = {
    file_id: "f1",
    filename: "leads.csv",
    format: "csv" as const,
    size_bytes: 2048,
    download_path: "/v1/files/f1",
  };

  it("keeps a reply's files so the chip draws after a reload", () => {
    const [question, reply] = toChatMessages([
      row({ id: "q1" }),
      row({ id: "a1", role: "assistant", content: "Done", file_refs: [ref] }),
    ]);
    expect(question.files).toBeUndefined();
    expect(reply.files).toEqual([ref]);
  });

  it("leaves files off a reply that made none", () => {
    const [reply] = toChatMessages([row({ role: "assistant", file_refs: [] })]);
    expect(reply.files).toBeUndefined();
  });
});

describe("approval answers in a stored conversation", () => {
  it("reads an answer that follows an assistant turn as a decision", () => {
    const messages = toChatMessages([
      row({ id: "u1", role: "user", content: "make a file" }),
      row({ id: "a1", role: "assistant", content: "Approve Create a file?" }),
      row({ id: "u2", role: "user", content: "approve" }),
      row({ id: "a2", role: "assistant", content: "Done." }),
      row({ id: "u3", role: "user", content: "deny" }),
    ]);
    expect(messages.map((m) => m.text)).toEqual([
      "make a file",
      "Approve Create a file?",
      "Approved",
      "Done.",
      "Denied",
    ]);
  });

  it("leaves an opening message that says approve alone", () => {
    expect(toChatMessages([row({ content: "approve" })])[0].text).toBe("approve");
  });
});
