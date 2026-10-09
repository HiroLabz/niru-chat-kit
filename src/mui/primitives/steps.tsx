"use client";

/**
 * Compound vertical steps list: a disclosure (`Trigger`/`Content`) wrapping an
 * ordered sequence of `Steps.Item`s, each with its own connecting `Steps.Bar`
 * drawn between it and the next item. Controlled when `open` is given,
 * uncontrolled otherwise (defaulting to `defaultOpen`), matching `Reasoning` and
 * `PromptInput`.
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

type StepsContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const StepsContext = createContext<StepsContextValue | null>(null);

/** Read by every compound part; throws outside `<Steps>` rather than rendering nothing. */
export function useSteps(): StepsContextValue {
  const context = useContext(StepsContext);
  if (!context) {
    throw new Error("Steps parts must be used inside <Steps>");
  }
  return context;
}

export type StepsSlotProps = {
  root?: Partial<StackProps>;
};

export function Steps({
  defaultOpen = true,
  open,
  onOpenChange,
  children,
  sx,
  className,
  slotProps,
}: {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
  sx?: StackProps["sx"];
  className?: string;
  slotProps?: StepsSlotProps;
}) {
  const isControlled = open !== undefined;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const currentOpen = isControlled ? open : internalOpen;

  function setOpen(next: boolean) {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  }

  const context: StepsContextValue = { open: currentOpen, setOpen };
  const { sx: rootSx, ...rootRest } = slotProps?.root ?? {};

  return (
    <StepsContext.Provider value={context}>
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
    </StepsContext.Provider>
  );
}

export type StepsTriggerSlotProps = {
  root?: Partial<ButtonBaseProps>;
};

function StepsTrigger({
  children,
  sx,
  className,
  slotProps,
}: {
  children?: ReactNode;
  sx?: ButtonBaseProps["sx"];
  className?: string;
  slotProps?: StepsTriggerSlotProps;
}) {
  const { open, setOpen } = useSteps();
  return (
    <ButtonBase
      onClick={() => setOpen(!open)}
      disableRipple
      className={className}
      sx={[{ alignSelf: "flex-start" }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
      {...slotProps?.root}
    >
      {children}
    </ButtonBase>
  );
}

export type StepsContentSlotProps = {
  root?: Partial<BoxProps>;
  collapse?: Partial<CollapseProps>;
};

function StepsContent({
  children,
  sx,
  className,
  slotProps,
}: {
  children?: ReactNode;
  sx?: BoxProps["sx"];
  className?: string;
  slotProps?: StepsContentSlotProps;
}) {
  const { open } = useSteps();
  return (
    <Collapse in={open} unmountOnExit {...slotProps?.collapse}>
      <Box className={className} sx={sx} {...slotProps?.root}>
        {children}
      </Box>
    </Collapse>
  );
}

export type StepsItemSlotProps = {
  root?: Partial<StackProps>;
};

function StepsItem({
  children,
  sx,
  className,
  slotProps,
}: {
  children?: ReactNode;
  sx?: StackProps["sx"];
  className?: string;
  slotProps?: StepsItemSlotProps;
}) {
  useSteps();
  const { sx: rootSx, ...rootRest } = slotProps?.root ?? {};
  return (
    <Stack
      direction="row"
      spacing={1}
      className={className}
      sx={[{ minWidth: 0 }, ...(Array.isArray(sx) ? sx : sx ? [sx] : []), ...(Array.isArray(rootSx) ? rootSx : rootSx ? [rootSx] : [])]}
      {...rootRest}
    >
      {children}
    </Stack>
  );
}

/** The connecting line drawn between one `Steps.Item` and the next. The last item in a
 *  list renders none — the caller only renders a `Bar` between items it knows have a
 *  follower, never after the final one. */
function StepsBar({
  sx,
  className,
}: {
  sx?: BoxProps["sx"];
  className?: string;
}) {
  useSteps();
  const { scheme } = useChatKitStyles();
  return (
    <Box
      aria-hidden
      data-testid="steps-bar"
      className={className}
      sx={[
        scheme((c) => ({ width: 2, flex: 1, minHeight: 12, bgcolor: c.border, alignSelf: "stretch" })),
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    />
  );
}

Steps.Trigger = StepsTrigger;
Steps.Content = StepsContent;
Steps.Item = StepsItem;
Steps.Bar = StepsBar;

export { StepsTrigger, StepsContent, StepsItem, StepsBar };
