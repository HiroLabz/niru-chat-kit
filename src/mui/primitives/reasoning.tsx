"use client";

/**
 * Compound disclosure for one turn's working process: open while the model is
 * streaming, collapsing on its own once streaming ends so a settled turn does not
 * leave the transcript cluttered with its own scratch work. Controlled when `open`
 * is given, uncontrolled otherwise, as `PromptInput` does.
 *
 * "Closes when streaming ends" only applies when the user left it alone: toggling
 * `Reasoning.Trigger` at any point during a streaming turn opts that turn out of the
 * auto-collapse, and the state the user left it in is what the turn settles on. A
 * fresh streaming turn forgets that opt-out and opens again, so a later turn is not
 * held open by a toggle made several turns ago.
 */

import { createContext, useContext, useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Collapse from "@mui/material/Collapse";
import type { BoxProps } from "@mui/material/Box";
import type { ButtonBaseProps } from "@mui/material/ButtonBase";
import type { CollapseProps } from "@mui/material/Collapse";

type ReasoningContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const ReasoningContext = createContext<ReasoningContextValue | null>(null);

/** Read by every compound part; throws outside `<Reasoning>` rather than rendering nothing. */
export function useReasoning(): ReasoningContextValue {
  const context = useContext(ReasoningContext);
  if (!context) {
    throw new Error("Reasoning parts must be used inside <Reasoning>");
  }
  return context;
}

export function Reasoning({
  isStreaming = false,
  open,
  onOpenChange,
  children,
  sx,
  className,
}: {
  isStreaming?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
  sx?: BoxProps["sx"];
  className?: string;
}) {
  const isControlled = open !== undefined;
  const [internalOpen, setInternalOpen] = useState(isStreaming);
  /** Whether the user touched the trigger during the streaming turn in progress. */
  const [userToggled, setUserToggled] = useState(false);
  const [prevStreaming, setPrevStreaming] = useState(isStreaming);

  /**
   * Adjusts the derived state when `isStreaming` changes, during this same render
   * rather than in an effect (React's "adjusting state when a prop changes"
   * pattern) — an effect would cost an extra render for a value already known now.
   */
  if (isStreaming !== prevStreaming) {
    setPrevStreaming(isStreaming);
    if (isStreaming) {
      setUserToggled(false);
      if (!isControlled) setInternalOpen(true);
      onOpenChange?.(true);
    } else if (!userToggled) {
      if (!isControlled) setInternalOpen(false);
      onOpenChange?.(false);
    }
  }

  const setOpen = (next: boolean) => {
    setUserToggled(true);
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const context: ReasoningContextValue = { open: isControlled ? open : internalOpen, setOpen };

  return (
    <ReasoningContext.Provider value={context}>
      <Box className={className} sx={sx}>
        {children}
      </Box>
    </ReasoningContext.Provider>
  );
}

export type ReasoningTriggerSlotProps = {
  root?: Partial<ButtonBaseProps>;
};

function ReasoningTrigger({
  children,
  sx,
  className,
  slotProps,
}: {
  children?: ReactNode;
  sx?: ButtonBaseProps["sx"];
  className?: string;
  slotProps?: ReasoningTriggerSlotProps;
}) {
  const { open, setOpen } = useReasoning();
  return (
    <ButtonBase
      onClick={() => setOpen(!open)}
      disableRipple
      className={className}
      sx={sx}
      {...slotProps?.root}
    >
      {children}
    </ButtonBase>
  );
}

export type ReasoningContentSlotProps = {
  root?: Partial<BoxProps>;
  collapse?: Partial<CollapseProps>;
};

function ReasoningContent({
  children,
  sx,
  className,
  slotProps,
}: {
  children?: ReactNode;
  sx?: BoxProps["sx"];
  className?: string;
  slotProps?: ReasoningContentSlotProps;
}) {
  const { open } = useReasoning();
  return (
    <Collapse in={open} unmountOnExit {...slotProps?.collapse}>
      <Box className={className} sx={sx} {...slotProps?.root}>
        {children}
      </Box>
    </Collapse>
  );
}

Reasoning.Trigger = ReasoningTrigger;
Reasoning.Content = ReasoningContent;

export { ReasoningTrigger, ReasoningContent };
