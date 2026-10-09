"use client";

/**
 * Compound chain-of-thought list: `ChainOfThought` holds the list of `.Step`s;
 * each `.Step` is itself a collapsible disclosure (`.Trigger`/`.Content`) that may
 * hold one or more `.Item` rows. A vertical timeline line is drawn down the left
 * edge connecting one step to the next — the last step in the list draws none,
 * since there is no follower to connect to.
 *
 * Nesting mirrors `Steps`: the outer `ChainOfThought` tracks which step ids are open
 * (uncontrolled unless the caller controls a given step itself), and each `.Step`
 * reads and writes its own open state through context, keyed by its `id`.
 */

import { createContext, useContext, useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Collapse from "@mui/material/Collapse";
import Stack from "@mui/material/Stack";
import type { BoxProps } from "@mui/material/Box";
import type { ButtonBaseProps } from "@mui/material/ButtonBase";
import type { CollapseProps } from "@mui/material/Collapse";
import type { StackProps } from "@mui/material/Stack";
import { useChatKitStyles } from "../theme";

type ChainOfThoughtContextValue = {
  isOpen: (id: string) => boolean;
  toggle: (id: string, next?: boolean) => void;
};

const ChainOfThoughtContext = createContext<ChainOfThoughtContextValue | null>(null);

/** Read by `.Step`; throws outside `<ChainOfThought>` rather than rendering nothing. */
export function useChainOfThought(): ChainOfThoughtContextValue {
  const context = useContext(ChainOfThoughtContext);
  if (!context) {
    throw new Error("ChainOfThought parts must be used inside <ChainOfThought>");
  }
  return context;
}

type ChainOfThoughtStepContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Whether this step has a follower, so it alone decides to draw a timeline line. */
  isLast: boolean;
};

const ChainOfThoughtStepContext = createContext<ChainOfThoughtStepContextValue | null>(null);

/** Read by `.Trigger`/`.Content`/`.Item`; throws outside `<ChainOfThought.Step>`. */
export function useChainOfThoughtStep(): ChainOfThoughtStepContextValue {
  const context = useContext(ChainOfThoughtStepContext);
  if (!context) {
    throw new Error("ChainOfThought parts must be used inside <ChainOfThought.Step>");
  }
  return context;
}

export type ChainOfThoughtSlotProps = {
  root?: Partial<StackProps>;
};

export function ChainOfThought({
  defaultOpenIds,
  children,
  sx,
  className,
  slotProps,
}: {
  /** Step ids open on mount; every other step starts collapsed. Defaults to all open. */
  defaultOpenIds?: string[];
  children?: ReactNode;
  sx?: StackProps["sx"];
  className?: string;
  slotProps?: ChainOfThoughtSlotProps;
}) {
  // Only ids a trigger has actually toggled live here; every other id falls through to
  // its default below. Tracking a flat "open ids" set instead would make the first
  // toggle of ANY step implicitly close every other step the moment the set stops
  // being empty, since "untouched" and "explicitly closed" would become indistinguishable.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  function isOpen(id: string): boolean {
    if (id in overrides) return overrides[id];
    return defaultOpenIds ? defaultOpenIds.includes(id) : true;
  }

  function toggle(id: string, next?: boolean) {
    const wantOpen = next ?? !isOpen(id);
    setOverrides((current) => ({ ...current, [id]: wantOpen }));
  }

  const context: ChainOfThoughtContextValue = { isOpen, toggle };
  const { sx: rootSx, ...rootRest } = slotProps?.root ?? {};

  return (
    <ChainOfThoughtContext.Provider value={context}>
      <Stack
        className={className}
        sx={[
          { width: "100%", minWidth: 0 },
          ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
          ...(Array.isArray(rootSx) ? rootSx : rootSx ? [rootSx] : []),
        ]}
        {...rootRest}
      >
        {children}
      </Stack>
    </ChainOfThoughtContext.Provider>
  );
}

export type ChainOfThoughtStepSlotProps = {
  root?: Partial<BoxProps>;
  line?: Partial<BoxProps>;
};

function ChainOfThoughtStep({
  id,
  isLast = false,
  children,
  sx,
  className,
  slotProps,
}: {
  id: string;
  /** This step has no follower: no timeline line is drawn below it. */
  isLast?: boolean;
  children?: ReactNode;
  sx?: BoxProps["sx"];
  className?: string;
  slotProps?: ChainOfThoughtStepSlotProps;
}) {
  const { isOpen, toggle } = useChainOfThought();
  const { scheme } = useChatKitStyles();
  const open = isOpen(id);
  const stepContext: ChainOfThoughtStepContextValue = {
    open,
    setOpen: (next) => toggle(id, next),
    isLast,
  };

  return (
    <ChainOfThoughtStepContext.Provider value={stepContext}>
      <Box
        className={className}
        sx={[
          { display: "flex", gap: 1, minWidth: 0 },
          ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
        ]}
        {...slotProps?.root}
      >
        <Box
          aria-hidden
          data-testid="chain-of-thought-line"
          sx={scheme((c) => ({
            width: 2,
            flexShrink: 0,
            alignSelf: "stretch",
            bgcolor: isLast ? "transparent" : c.border,
          }))}
          {...slotProps?.line}
        />
        <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1, pb: isLast ? 0 : 1 }}>
          {children}
        </Stack>
      </Box>
    </ChainOfThoughtStepContext.Provider>
  );
}

export type ChainOfThoughtTriggerSlotProps = {
  root?: Partial<ButtonBaseProps>;
};

function ChainOfThoughtTrigger({
  leftIcon,
  children,
  sx,
  className,
  slotProps,
}: {
  leftIcon?: ReactNode;
  children?: ReactNode;
  sx?: ButtonBaseProps["sx"];
  className?: string;
  slotProps?: ChainOfThoughtTriggerSlotProps;
}) {
  const { open, setOpen } = useChainOfThoughtStep();
  return (
    <ButtonBase
      onClick={() => setOpen(!open)}
      disableRipple
      className={className}
      sx={[
        { alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 0.75 },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
      {...slotProps?.root}
    >
      {leftIcon}
      {children}
    </ButtonBase>
  );
}

export type ChainOfThoughtContentSlotProps = {
  root?: Partial<BoxProps>;
  collapse?: Partial<CollapseProps>;
};

function ChainOfThoughtContent({
  children,
  sx,
  className,
  slotProps,
}: {
  children?: ReactNode;
  sx?: BoxProps["sx"];
  className?: string;
  slotProps?: ChainOfThoughtContentSlotProps;
}) {
  const { open } = useChainOfThoughtStep();
  return (
    <Collapse in={open} unmountOnExit {...slotProps?.collapse}>
      <Box className={className} sx={sx} {...slotProps?.root}>
        {children}
      </Box>
    </Collapse>
  );
}

export type ChainOfThoughtItemSlotProps = {
  root?: Partial<BoxProps>;
};

function ChainOfThoughtItem({
  children,
  sx,
  className,
  slotProps,
}: {
  children?: ReactNode;
  sx?: BoxProps["sx"];
  className?: string;
  slotProps?: ChainOfThoughtItemSlotProps;
}) {
  useChainOfThoughtStep();
  return (
    <Box className={className} sx={sx} {...slotProps?.root}>
      {children}
    </Box>
  );
}

ChainOfThought.Step = ChainOfThoughtStep;
ChainOfThought.Trigger = ChainOfThoughtTrigger;
ChainOfThought.Content = ChainOfThoughtContent;
ChainOfThought.Item = ChainOfThoughtItem;

export { ChainOfThoughtStep, ChainOfThoughtTrigger, ChainOfThoughtContent, ChainOfThoughtItem };
