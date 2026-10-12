import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { QuestionCard } from "./question-card";

const OPTIONS = ["Cebu City", "Mactan", "Not decided yet"];

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function show(props: Partial<React.ComponentProps<typeof QuestionCard>> = {}) {
  const onAnswer = vi.fn();
  render(<QuestionCard question="Where will you be staying?" options={OPTIONS} onAnswer={onAnswer} {...props} />);
  return onAnswer;
}
const flush = () => act(() => void vi.advanceTimersByTime(400));

describe("QuestionCard", () => {
  it("shows the heading, the question once and a numbered row for each suggested answer", () => {
    show();
    expect(screen.getByText("One detail before I continue")).toBeInTheDocument();
    expect(screen.getAllByText("Where will you be staying?")).toHaveLength(1);
    const rows = screen.getAllByRole("button");
    expect(rows).toHaveLength(OPTIONS.length);
    expect(rows[1]).toHaveTextContent("2Mactan");
    expect(rows[1]).toHaveAttribute("aria-keyshortcuts", "2");
  });

  it("marks a tapped row as picked, then sends its text", () => {
    const onAnswer = show();
    fireEvent.click(screen.getByRole("button", { name: /Mactan/ }));
    expect(screen.getByRole("button", { name: /Mactan/ })).toHaveAttribute("aria-pressed", "true");
    expect(onAnswer).not.toHaveBeenCalled();
    flush();
    expect(onAnswer).toHaveBeenCalledExactlyOnceWith("Mactan");
  });

  it("answers with the number keys, but not while typing in a field", () => {
    const onAnswer = show();
    const field = document.createElement("textarea");
    document.body.appendChild(field);
    fireEvent.keyDown(field, { key: "1" });
    flush();
    expect(onAnswer).not.toHaveBeenCalled();
    fireEvent.keyDown(document.body, { key: "3" });
    flush();
    expect(onAnswer).toHaveBeenCalledExactlyOnceWith("Not decided yet");
    field.remove();
  });

  it("adds a Something else row that hands over to the message box", () => {
    const onOther = vi.fn();
    const onAnswer = show({ onOther });
    const other = screen.getByRole("button", { name: /Something else/ });
    expect(other).toHaveTextContent("4");
    fireEvent.click(other);
    expect(onOther).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document.body, { key: "4" });
    expect(onOther).toHaveBeenCalledTimes(2);
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it("answers with the decide phrase when the app supplies one, and has no link otherwise", () => {
    const onAnswer = show({ decideAnswer: "Use your best judgement" });
    fireEvent.click(screen.getByRole("button", { name: "Let the agent decide" }));
    expect(onAnswer).toHaveBeenCalledWith("Use your best judgement");
  });

  it("offers no decide link by default", () => {
    show();
    expect(screen.queryByRole("button", { name: "Let the agent decide" })).not.toBeInTheDocument();
  });

  it("points an open question at the message box", () => {
    show({ options: [] });
    expect(screen.getByText("Answer in the message box below")).toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("keeps the heading but not the question when the reply already says it", () => {
    show({ showQuestion: false });
    expect(screen.getByText("One detail before I continue")).toBeInTheDocument();
    expect(screen.queryByText("Where will you be staying?")).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "One detail before I continue" })).toBeInTheDocument();
  });

  it("folds into the question and the bold answer, with Change only when given", () => {
    const onChange = vi.fn();
    const { rerender } = render(<QuestionCard question="Where will you be staying?" answered="Mactan" />);
    expect(screen.getByText("Mactan").tagName).toBe("B");
    expect(screen.queryByRole("button", { name: "Change" })).not.toBeInTheDocument();
    expect(screen.queryByText("One detail before I continue")).not.toBeInTheDocument();
    rerender(<QuestionCard question="Where will you be staying?" answered="Mactan" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("ignores keys once answered and while pending", () => {
    const onAnswer = vi.fn();
    const { rerender } = render(<QuestionCard question="Q" options={OPTIONS} onAnswer={onAnswer} pending />);
    fireEvent.keyDown(document.body, { key: "1" });
    flush();
    expect(onAnswer).not.toHaveBeenCalled();
    rerender(<QuestionCard question="Q" options={OPTIONS} onAnswer={onAnswer} answered="Mactan" />);
    fireEvent.keyDown(document.body, { key: "1" });
    flush();
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it("accepts one answer: two rapid number keys answer once", () => {
    const onAnswer = show();
    act(() => {
      fireEvent.keyDown(document.body, { key: "2" });
      fireEvent.keyDown(document.body, { key: "2" });
    });
    flush();
    expect(onAnswer).toHaveBeenCalledExactlyOnceWith("Mactan");
  });

  it("accepts one answer: two rapid taps, or a tap then a key or the decide link, answer once", () => {
    const onAnswer = show({ decideAnswer: "Use your judgement" });
    const row = screen.getByRole("button", { name: /Mactan/ });
    const decide = screen.getByRole("button", { name: "Let the agent decide" });
    act(() => {
      fireEvent.click(row);
      fireEvent.click(row);
      fireEvent.keyDown(document.body, { key: "1" });
      fireEvent.click(decide);
    });
    flush();
    expect(onAnswer).toHaveBeenCalledExactlyOnceWith("Mactan");
  });

  it("answers again once the question changes", () => {
    const onAnswer = vi.fn();
    const { rerender } = render(<QuestionCard question="Q1" options={OPTIONS} onAnswer={onAnswer} />);
    fireEvent.keyDown(document.body, { key: "1" });
    flush();
    rerender(<QuestionCard question="Q2" options={OPTIONS} onAnswer={onAnswer} />);
    fireEvent.keyDown(document.body, { key: "2" });
    flush();
    expect(onAnswer).toHaveBeenCalledTimes(2);
  });
});
