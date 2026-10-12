"use client";

import { useEffect, useId, useRef, useState } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import { blend, readableOn, useChatKitStyles } from "../theme";

export type QuestionCardLabels = {
  /** The card's heading. */
  heading: string;
  /** The last row, which hands the person to the message box. */
  other: string;
  /** Shown instead of the rows when the agent offered no suggested answers. */
  openHint: string;
  /** Shown under the rows on a screen with a keyboard. */
  keysHint: string;
  /** The link that answers with `decideAnswer`. */
  decide: string;
  /** The link on the answered line that reopens the card. */
  change: string;
};

const DEFAULT_LABELS: QuestionCardLabels = {
  heading: "One detail before I continue",
  other: "Something else: type it below",
  openHint: "Answer in the message box below",
  keysHint: "Press a number, or type your own answer",
  decide: "Let the agent decide",
  change: "Change",
};

/** How long a tapped row shows as picked before the answer goes out. */
const PICK_DELAY_MS = 250;
const MAX_KEYED_ROWS = 9;
const ROW_MIN_HEIGHT = 44;
const TINT_CARD = 0.06;
const TINT_BORDER = 0.35;
const TINT_ACTIVE = 0.16;

export type QuestionCardProps = {
  question: string;
  /** The suggested answers the agent sent (`interrupt.options`), shown as numbered rows. Empty or omitted: an open question. */
  options?: string[];
  /** Called with the answer when a row or the decide link is chosen. */
  onAnswer?: (answer: string) => void;
  /** Given, a last "Something else" row is shown; pick it to move the person to the message box. */
  onOther?: () => void;
  /** Given, a "Let the agent decide" link answers with this phrase. Omitted: no link. */
  decideAnswer?: string;
  /** The text of that link; default "Let the agent decide". */
  decideLabel?: string;
  /** Set once the question has an answer: the card folds into one line, the question and this answer. */
  answered?: string;
  /** Given with `answered`, a "Change" link reopens the card. Show it only while the run has not used the answer. */
  onChange?: () => void;
  /** `false` when the agent's reply already ends with the question: the card keeps its heading and rows but does not say the question again. Default: true. */
  showQuestion?: boolean;
  /** Disables the rows while an answer is being sent. */
  pending?: boolean;
  /** Keys 1 to 9 pick a row while focus is not in a text field. Default: true. */
  keyboard?: boolean;
  labels?: Partial<QuestionCardLabels>;
};

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/**
 * An agent's question as a card in the thread. The suggested answers are numbered rows
 * (keys 1 to 9 pick them), a last row moves the person to the normal message box, and an
 * optional link lets the agent decide. Once answered it folds into one line.
 *
 * Colours come from the tokens: the `accent` tint over `surface`, in both colour schemes.
 */
export function QuestionCard({
  question,
  options = [],
  onAnswer,
  onOther,
  decideAnswer,
  decideLabel,
  answered,
  onChange,
  showQuestion = true,
  pending = false,
  keyboard = true,
  labels,
}: QuestionCardProps) {
  const { scheme } = useChatKitStyles();
  const text = { ...DEFAULT_LABELS, ...labels };
  const questionId = useId();
  const [picked, setPicked] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rows = options.slice(0, MAX_KEYED_ROWS);
  const otherNumber = onOther && rows.length < MAX_KEYED_ROWS ? rows.length + 1 : null;
  /** Set the moment an answer is chosen, before React re-renders, so a second key or tap in the same breath is ignored. */
  const sentRef = useRef(false);
  const [sent, setSent] = useState(false);
  const locked = pending || sent || picked !== null;
  const settled = answered !== undefined;

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // One answer per question: a different question (or different rows) starts afresh.
  const rowsKey = rows.join("\n");
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    sentRef.current = false;
    setSent(false);
    setPicked(null);
  }, [question, rowsKey]);

  function choose(index: number) {
    if (sentRef.current || locked || !onAnswer) return;
    sentRef.current = true;
    setPicked(index);
    timer.current = setTimeout(() => onAnswer(rows[index]), PICK_DELAY_MS);
  }
  function decide(answer: string) {
    if (sentRef.current || locked || !onAnswer) return;
    sentRef.current = true;
    setSent(true);
    onAnswer(answer);
  }
  function chooseOther() {
    if (!locked) onOther?.();
  }

  // Keys are read on the window: the card holds no focus until someone tabs into it, and the
  // message box below must keep every digit typed into it.
  const latest = useRef({ choose, chooseOther, rows, otherNumber });
  useEffect(() => {
    latest.current = { choose, chooseOther, rows, otherNumber };
  });
  useEffect(() => {
    if (!keyboard || settled || rows.length === 0) return;
    function onKey(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
      if (!/^[1-9]$/.test(event.key)) return;
      const now = latest.current;
      const number = Number(event.key);
      if (number <= now.rows.length) now.choose(number - 1);
      else if (number === now.otherNumber) now.chooseOther();
      else return;
      event.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [keyboard, settled, rows.length]);

  if (settled) {
    return (
      <Box
        data-chat="question-answered"
        sx={[
          {
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            columnGap: 1,
            rowGap: 0.25,
            minWidth: 0,
            px: 1.5,
            py: 1.1,
            border: 1,
            borderRadius: 3,
            fontSize: 13,
            overflowWrap: "anywhere",
          },
          scheme((c) => ({ borderColor: c.border, color: c.mutedText })),
        ]}
      >
        <Box component="span" sx={{ minWidth: 0 }}>
          {question}{" "}
          <Box component="b" sx={scheme((c) => ({ color: c.text, fontWeight: 600 }))}>
            {answered}
          </Box>
        </Box>
        {onChange ? (
          <ButtonBase
            onClick={onChange}
            sx={[
              { ml: "auto", minHeight: 32, px: 0.5, borderRadius: 1, fontSize: 13, font: "inherit" },
              scheme((c) => ({ color: c.accent, "&:focus-visible": { outline: `2px solid ${c.accent}` } })),
            ]}
          >
            {text.change}
          </ButtonBase>
        ) : null}
      </Box>
    );
  }

  return (
    <Box
      role="group"
      aria-labelledby={questionId}
      data-chat="question-card"
      sx={[
        { border: 1, borderRadius: 3.5, px: 1.75, pt: 1.5, pb: 1.75, minWidth: 0 },
        scheme((c) => ({
          bgcolor: blend(c.accent, c.surface, TINT_CARD),
          borderColor: blend(c.accent, c.border, TINT_BORDER),
          color: c.text,
        })),
      ]}
    >
      <Box
        sx={[
          { display: "flex", alignItems: "center", gap: 1, mb: 1, fontSize: 12.5, fontWeight: 600 },
          scheme((c) => ({ color: readableOn(blend(c.accent, c.surface, TINT_CARD), [c.accent, c.text]) })),
        ]}
      >
        <Box
          aria-hidden
          sx={[
            { width: 7, height: 7, borderRadius: "50%", flexShrink: 0 },
            scheme((c) => ({ bgcolor: c.accent, boxShadow: `0 0 0 4px ${blend(c.accent, c.surface, 0.2)}` })),
          ]}
        />
        <span id={showQuestion ? undefined : questionId}>{text.heading}</span>
      </Box>
      {showQuestion ? (
        <Typography
          id={questionId}
          sx={{ fontSize: 15, fontWeight: 600, mb: 1.25, whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: 1.45 }}
        >
          {question}
        </Typography>
      ) : null}
      {rows.length > 0 ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {rows.map((option, index) => (
            <AnswerRow
              key={`${index}-${option}`}
              number={index + 1}
              label={option}
              picked={picked === index}
              disabled={locked && picked !== index}
              onPick={() => choose(index)}
            />
          ))}
          {otherNumber ? (
            <AnswerRow number={otherNumber} label={text.other} other disabled={locked} onPick={chooseOther} />
          ) : null}
        </Box>
      ) : null}
      <Box
        sx={[
          { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", columnGap: 2, mt: rows.length ? 1.25 : 0, fontSize: 12.5 },
          scheme((c) => ({ color: c.mutedText })),
        ]}
      >
        <Box
          component="span"
          sx={rows.length ? { "@media (hover: none)": { display: "none" } } : undefined}
        >
          {rows.length ? text.keysHint : text.openHint}
        </Box>
        {decideAnswer !== undefined ? (
          <ButtonBase
            disabled={locked}
            onClick={() => decide(decideAnswer)}
            sx={[
              { ml: "auto", minHeight: 36, px: 0.5, borderRadius: 1, font: "inherit", fontSize: 12.5 },
              scheme((c) => ({ color: c.accent, "&:focus-visible": { outline: `2px solid ${c.accent}` } })),
            ]}
          >
            {decideLabel ?? text.decide}
          </ButtonBase>
        ) : null}
      </Box>
    </Box>
  );
}

function AnswerRow({
  number,
  label,
  picked = false,
  other = false,
  disabled,
  onPick,
}: {
  number: number;
  label: string;
  picked?: boolean;
  other?: boolean;
  disabled?: boolean;
  onPick: () => void;
}) {
  const { scheme } = useChatKitStyles();
  return (
    <ButtonBase
      onClick={onPick}
      disabled={disabled}
      aria-pressed={other ? undefined : picked}
      aria-keyshortcuts={String(number)}
      sx={[
        {
          display: "flex",
          justifyContent: "flex-start",
          alignItems: "center",
          gap: 1.25,
          width: "100%",
          minHeight: ROW_MIN_HEIGHT,
          px: 1.5,
          py: 1,
          border: 1,
          borderStyle: other ? "dashed" : "solid",
          borderRadius: 2.5,
          textAlign: "left",
          font: "inherit",
          fontSize: 14.5,
          minWidth: 0,
        },
        scheme((c) => ({
          bgcolor: picked ? blend(c.accent, c.surface, TINT_ACTIVE) : other ? "transparent" : c.surface,
          borderColor: picked ? c.accent : c.border,
          color: other ? c.mutedText : c.text,
          "&:hover": { bgcolor: blend(c.accent, c.surface, 0.12), borderColor: blend(c.accent, c.border, 0.6) },
          "&:focus-visible": { outline: `2px solid ${c.accent}`, outlineOffset: 1 },
          "&.Mui-disabled": { opacity: 0.55, color: other ? c.mutedText : c.text },
        })),
      ]}
    >
      <Box
        component="span"
        aria-hidden
        sx={[
          { width: 22, height: 22, borderRadius: 1.5, border: 1, fontSize: 12, display: "grid", placeItems: "center", flexShrink: 0 },
          scheme((c) => ({
            borderColor: picked ? c.accent : c.border,
            bgcolor: picked ? c.accent : "transparent",
            color: picked ? c.accentContrast : c.mutedText,
          })),
        ]}
      >
        {number}
      </Box>
      <Box component="span" sx={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
        {label}
      </Box>
    </ButtonBase>
  );
}
