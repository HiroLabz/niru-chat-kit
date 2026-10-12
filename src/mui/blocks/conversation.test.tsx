import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ChatMessage } from "../../core/types";
import type { WorkingStep } from "../../core/working-process";
import { columnPadding, Conversation } from "./conversation";

const searchStep: WorkingStep = {
  id: "t1",
  kind: "tool",
  name: "web_search",
  title: "Searched the web",
  status: "success",
  parentId: null,
  durationMs: 2000,
};

const user: ChatMessage = { id: "u1", role: "user", text: "What is new?" };

describe("Conversation", () => {
  it("shows a user turn verbatim and an assistant turn as Markdown", () => {
    render(
      <Conversation
        messages={[user, { id: "a1", role: "assistant", text: "Here is **bold** text" }]}
      />
    );
    expect(screen.getByText("What is new?")).toBeInTheDocument();
    expect(screen.getByText("bold").tagName).toBe("STRONG");
  });

  it("shows the empty state, or the default prompt, when there are no messages", () => {
    const { rerender } = render(<Conversation messages={[]} />);
    expect(screen.getByText("Say hello to start the conversation.")).toBeInTheDocument();
    rerender(<Conversation messages={[]} emptyState={<p>Ask me anything</p>} />);
    expect(screen.getByText("Ask me anything")).toBeInTheDocument();
  });

  it("draws the footer after the last turn, and instead of the empty state", () => {
    const { rerender } = render(<Conversation messages={[user]} footer={<p>Open card</p>} />);
    const log = screen.getByRole("log");
    expect(log.lastElementChild).toHaveTextContent("Open card");
    rerender(<Conversation messages={[]} footer={<p>Open card</p>} />);
    expect(screen.getByText("Open card")).toBeInTheDocument();
    expect(screen.queryByText("Say hello to start the conversation.")).not.toBeInTheDocument();
  });

  it("puts the activity timeline above the answer and opens it to show the tool", () => {
    render(
      <Conversation
        messages={[
          user,
          {
            id: "a1",
            role: "assistant",
            text: "Done.",
            at: 1000,
            settledAt: 4000,
            parts: [
              { kind: "reasoning", id: "r1", text: "Let me look it up" },
              { kind: "activity", id: "act1", steps: [searchStep] },
              { kind: "text", id: "tx1", text: "Done." },
            ],
          },
        ]}
      />
    );
    expect(screen.getByText("Done.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Worked for 3s" }));
    fireEvent.click(screen.getByRole("button", { name: /Web search/ }));
    expect(screen.getAllByText("Searched the web").length).toBeGreaterThan(0);
  });

  it("lists the working steps of a turn that has no parts", () => {
    render(
      <Conversation
        messages={[
          user,
          { id: "a1", role: "assistant", text: "Done.", steps: [searchStep, { ...searchStep, id: "t2" }] },
        ]}
      />
    );
    expect(screen.getByText(/Thought for/)).toBeInTheDocument();
  });

  it("shows the sources, stopped note and generated files under the answer", () => {
    render(
      <Conversation
        messages={[
          user,
          {
            id: "a1",
            role: "assistant",
            text: "Answer",
            status: "stopped",
            citations: [{ kind: "document", label: "Handbook.pdf" }],
            files: [{ filename: "report.csv", format: "csv", size_bytes: 2048 }],
          },
        ]}
      />
    );
    expect(screen.getByText("Handbook.pdf")).toBeInTheDocument();
    expect(screen.getByTestId("message-stopped")).toBeInTheDocument();
    expect(screen.getByText("report.csv")).toBeInTheDocument();
  });

  it("renders the app's extras under an assistant answer only", () => {
    const renderExtras = vi.fn((message: ChatMessage) => <p>extra for {message.id}</p>);
    render(
      <Conversation
        messages={[user, { id: "a1", role: "assistant", text: "Answer" }]}
        renderExtras={renderExtras}
      />
    );
    expect(screen.getByText("extra for a1")).toBeInTheDocument();
    expect(screen.queryByText("extra for u1")).not.toBeInTheDocument();
  });

  it("renders the app's user extras on the user's turn only", () => {
    render(
      <Conversation
        messages={[user, { id: "a1", role: "assistant", text: "Answer" }]}
        renderUserExtras={(message) => <p>files of {message.id}</p>}
      />
    );
    expect(screen.getByText("files of u1")).toBeInTheDocument();
    expect(screen.queryByText("files of a1")).not.toBeInTheDocument();
  });

  it("draws nothing for a settled assistant turn that has nothing to show", () => {
    render(<Conversation messages={[user, { id: "a1", role: "assistant", text: "" }]} />);
    expect(screen.queryByText("H")).not.toBeInTheDocument();
  });

  it("uses renderMessage for a turn it claims and the kit's turn for the rest", () => {
    render(
      <Conversation
        messages={[user, { id: "a1", role: "assistant", text: "Answer" }]}
        renderMessage={(message) => (message.role === "user" ? <p>custom user</p> : null)}
      />
    );
    expect(screen.getByText("custom user")).toBeInTheDocument();
    expect(screen.getByText("Answer")).toBeInTheDocument();
  });

  it("appends a typing row with Stop while connecting", () => {
    const onStop = vi.fn();
    render(<Conversation messages={[user]} typing onStop={onStop} />);
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("offers Stop on a pending turn that has no text yet", () => {
    const onStop = vi.fn();
    render(
      <Conversation messages={[user, { id: "a1", role: "assistant", text: "", pending: true }]} onStop={onStop} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("draws the app's avatar on the settled turns and the live one on the newest while it runs", () => {
    render(
      <Conversation
        messages={[
          { id: "a0", role: "assistant", text: "Earlier" },
          user,
          { id: "a1", role: "assistant", text: "Now", pending: true },
        ]}
        agentAvatar={<span>still face</span>}
        liveAvatar={<span>live face</span>}
      />
    );
    expect(screen.getAllByText("still face")).toHaveLength(1);
    expect(screen.getAllByText("live face")).toHaveLength(1);
  });

  it("drops every face when the app passes null, including on the typing row", () => {
    const { container } = render(
      <Conversation
        messages={[{ id: "a0", role: "assistant", text: "Earlier" }, user]}
        agentInitial="Q"
        agentAvatar={null}
        liveAvatar={null}
        typing
      />
    );
    expect(container.querySelector(".MuiAvatar-root")).toBeNull();
    expect(screen.queryByText("Q")).not.toBeInTheDocument();
  });

  it("still falls back to the initial when no avatar is given", () => {
    render(<Conversation messages={[user]} agentInitial="Q" typing />);
    expect(screen.getByText("Q")).toBeInTheDocument();
  });

  it("marks the timestamp so an app can show it on hover only", () => {
    const { container } = render(
      <Conversation messages={[{ id: "a0", role: "assistant", text: "Hello", at: 1000 }]} />
    );
    expect(container.querySelector("[data-chat-timestamp]")).not.toBeNull();
  });

  it("centres the turns in a column only when columnMaxWidth is given", () => {
    expect(columnPadding(760)).toEqual({ paddingInline: "max(24px, calc((100% - 760px) / 2))" });
    const { container } = render(<Conversation messages={[user]} columnMaxWidth={760} />);
    expect(container.querySelector('[role="log"]')).not.toBeNull();
  });
});

describe("Conversation questions", () => {
  const asked: ChatMessage = { id: "a1", role: "assistant", text: "I can move it. I need one detail first." };
  const interrupt = { kind: "clarify", question: "Where will you be staying?", options: ["Cebu City", "Mactan"] };

  it("draws a pending question as a card after the last turn", () => {
    const onAnswer = vi.fn();
    render(<Conversation messages={[user, asked]} question={{ interrupt, onAnswer }} />);
    expect(screen.getByText("One detail before I continue")).toBeInTheDocument();
    expect(screen.getByText("Where will you be staying?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cebu City/ })).toBeInTheDocument();
  });

  it("does not say the question twice when the reply already ends with it", () => {
    const reply: ChatMessage = { id: "a2", role: "assistant", text: "Quick check.\n\nWhere will you be staying?" };
    render(<Conversation messages={[user, reply]} question={{ interrupt, onAnswer: vi.fn() }} />);
    expect(screen.getAllByText(/Where will you be staying\?/)).toHaveLength(1);
    expect(screen.getByText("One detail before I continue")).toBeInTheDocument();
  });

  it("shows nothing extra without the question prop", () => {
    render(<Conversation messages={[user, asked]} />);
    expect(screen.queryByText("One detail before I continue")).not.toBeInTheDocument();
  });

  const answer: ChatMessage = { id: "u2", role: "user", text: "Mactan", answersQuestion: { question: "Where will you be staying?" } };

  it("folds an answered question into one line when foldAnswers is on", () => {
    render(<Conversation messages={[user, asked, answer]} foldAnswers />);
    expect(screen.getByText("Mactan").tagName).toBe("B");
    expect(screen.getByText(/Where will you be staying\?/)).toBeInTheDocument();
  });

  it("keeps the bubble when foldAnswers is off", () => {
    render(<Conversation messages={[user, asked, answer]} />);
    expect(screen.getByText("Mactan").tagName).not.toBe("B");
    expect(screen.queryByText(/Where will you be staying\?/)).not.toBeInTheDocument();
  });

  it("offers Change only on the newest folded line", () => {
    const onChangeAnswer = vi.fn();
    const reply: ChatMessage = { id: "a3", role: "assistant", text: "Got it." };
    const { rerender } = render(<Conversation messages={[user, asked, answer]} foldAnswers onChangeAnswer={onChangeAnswer} />);
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    expect(onChangeAnswer).toHaveBeenCalledWith(answer);
    rerender(<Conversation messages={[user, asked, answer, reply]} foldAnswers onChangeAnswer={onChangeAnswer} />);
    expect(screen.queryByRole("button", { name: "Change" })).not.toBeInTheDocument();
  });
});
