"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { type ApprovalInterrupt } from "../../core/approval";
import { APPROVAL_INTERRUPT_KIND } from "../../core/approval-answers";
import type { Interrupt } from "../../core/types";
import { blend, readableOn, useChatKitStyles } from "../theme";
import { ApprovalCard } from "./approval-card";
import { QuestionCard } from "./question-card";

/**
 * Why the run stopped, said before anything else.
 *
 * The bar appears mid-conversation carrying only the engine's own wording, so without a
 * heading nothing on screen said the run was waiting on a decision rather than something
 * having gone wrong.
 */
const APPROVAL_HEADING = "Approval needed";
const QUESTION_HEADING = "Waiting for your answer";

const LIGHT_WARNING_WEIGHT = 0.12;
const DARK_WARNING_WEIGHT = 0.2;

/**
 * The pause a run is waiting on, rendered inline in the chat.
 *
 * Three shapes, one component: a plain question keeps its free-text box, an approval
 * gate becomes approve/deny buttons, and an approval gate whose agent authored a
 * resume form renders that form above the buttons, the same fields the hosted
 * approval page shows, since both read the schema snapshotted onto the pause.
 *
 * The paused panel is a tint of the `warning` token over the `surface` token, with the
 * `text` (else `surface`) token as ink, whichever reads better on it. Deriving both from
 * tokens keeps the pause in the host's palette in both colour schemes.
 */
export function InterruptPrompt({
  interrupt,
  onAnswer,
  pending,
  autoFocus = true,
}: {
  interrupt: Interrupt | ApprovalInterrupt;
  onAnswer: (answer: string, values?: Record<string, unknown>) => void;
  pending?: boolean;
  autoFocus?: boolean;
}) {
  const { scheme } = useChatKitStyles();
  const isApproval = interrupt.kind === APPROVAL_INTERRUPT_KIND;
  const [answer, setAnswer] = useState("");

  const pausedSurface = scheme((c, _all, mode) => {
    const surface = blend(c.warning, c.surface, mode === "light" ? LIGHT_WARNING_WEIGHT : DARK_WARNING_WEIGHT);
    return { bgcolor: surface, borderTop: 1, borderColor: c.border };
  });
  const pausedInk = scheme((c, _all, mode) => {
    const surface = blend(c.warning, c.surface, mode === "light" ? LIGHT_WARNING_WEIGHT : DARK_WARNING_WEIGHT);
    return { color: readableOn(surface, [c.text, c.surface]) };
  });

  return (
    <Box
      component="form"
      onSubmit={(event) => {
        event.preventDefault();
        if (answer.trim()) {
          onAnswer(answer.trim());
          setAnswer("");
        }
      }}
      sx={[{ display: "flex", flexDirection: "column", gap: 1, p: 1.5 }, pausedSurface]}
    >
      <Typography
        variant="caption"
        sx={[{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }, pausedInk]}
      >
        {isApproval ? APPROVAL_HEADING : QUESTION_HEADING}
      </Typography>
      <Typography
        variant="body2"
        // The engine sends this as several lines: a summary, then `Tool:` and `Args:`
        // each on their own. Default `white-space` collapsed all of it onto one run, so
        // the bar read as an unlabelled dump nobody could place.
        sx={[{ fontWeight: 500, whiteSpace: "pre-wrap" }, pausedInk]}
      >
        {interrupt.question}
      </Typography>
      {isApproval ? (
        <ApprovalCard interrupt={interrupt as ApprovalInterrupt} onAnswer={onAnswer} pending={pending} inkSx={pausedInk} />
      ) : (
        <QuestionCard value={answer} onChange={setAnswer} pending={pending} autoFocus={autoFocus} />
      )}
    </Box>
  );
}
