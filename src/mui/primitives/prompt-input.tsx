"use client";

/**
 * Compound text composer: context holds the draft value and submit gating, parts read
 * it so a caller assembles its own layout (attachments, settings, actions) around a
 * single textarea rather than threading value/onChange/onKeyDown through every part by
 * hand. Controlled when `value` is given, uncontrolled otherwise, as prompt-kit does.
 *
 * Enter submits unless Shift is held or an IME composition is in progress. Composition
 * is read two ways: `event.nativeEvent.isComposing`, which some browsers clear a tick
 * late, and `compositionstart`/`compositionend` tracked locally, which does not race it.
 * Either source reporting "composing" blocks the submit.
 */

import {
  createContext,
  useContext,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import Box from "@mui/material/Box";
import InputBase from "@mui/material/InputBase";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import type { BoxProps } from "@mui/material/Box";
import type { InputBaseProps } from "@mui/material/InputBase";
import type { StackProps } from "@mui/material/Stack";
import type { TooltipProps } from "@mui/material/Tooltip";

const DEFAULT_MAX_ROWS = 12;

type PromptInputContextValue = {
  value: string;
  setValue: (value: string) => void;
  canSubmit: boolean;
  isLoading: boolean;
  disabled: boolean;
  maxRows: number;
  handleKeyDown: (event: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
  handleCompositionStart: () => void;
  handleCompositionEnd: () => void;
};

const PromptInputContext = createContext<PromptInputContextValue | null>(null);

/** Read by every compound part; throws outside `<PromptInput>` rather than rendering nothing. */
export function usePromptInput(): PromptInputContextValue {
  const context = useContext(PromptInputContext);
  if (!context) {
    throw new Error("PromptInput parts must be used inside <PromptInput>");
  }
  return context;
}

export type PromptInputSlotProps = {
  root?: Partial<BoxProps>;
};

export function PromptInput({
  value,
  defaultValue = "",
  onValueChange,
  onSubmit,
  isLoading = false,
  disabled = false,
  maxRows = DEFAULT_MAX_ROWS,
  children,
  sx,
  className,
  slotProps,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  maxRows?: number;
  children?: ReactNode;
  sx?: BoxProps["sx"];
  className?: string;
  slotProps?: PromptInputSlotProps;
}) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;
  const composingRef = useRef(false);

  function setValue(next: string) {
    if (!isControlled) setInternalValue(next);
    onValueChange?.(next);
  }

  const canSubmit = currentValue.trim().length > 0 && !disabled && !isLoading;

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    if (event.nativeEvent.isComposing || composingRef.current) return;
    event.preventDefault();
    if (canSubmit) onSubmit();
  }

  function handleCompositionStart() {
    composingRef.current = true;
  }

  function handleCompositionEnd() {
    composingRef.current = false;
  }

  const context: PromptInputContextValue = {
    value: currentValue,
    setValue,
    canSubmit,
    isLoading,
    disabled,
    maxRows,
    handleKeyDown,
    handleCompositionStart,
    handleCompositionEnd,
  };

  const { sx: rootSx, ...rootRest } = slotProps?.root ?? {};

  return (
    <PromptInputContext.Provider value={context}>
      <Box className={className} sx={[...(Array.isArray(sx) ? sx : sx ? [sx] : []), ...(Array.isArray(rootSx) ? rootSx : rootSx ? [rootSx] : [])]} {...rootRest}>
        {children}
      </Box>
    </PromptInputContext.Provider>
  );
}

export type PromptInputTextareaSlotProps = {
  input?: Partial<InputBaseProps>;
};

function PromptInputTextarea({
  placeholder,
  autoFocus = false,
  onKeyDown,
  sx,
  className,
  slotProps,
}: {
  placeholder?: string;
  autoFocus?: boolean;
  /**
   * Runs before the submit/newline handling below. Call `event.preventDefault()`
   * to take over the key entirely (own navigation, own fill-in, own dismissal) —
   * a caller that owns a suggestions list above the field uses this to intercept
   * ArrowUp/ArrowDown/Enter/Escape without this component knowing it exists.
   */
  onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
  sx?: InputBaseProps["sx"];
  className?: string;
  slotProps?: PromptInputTextareaSlotProps;
}) {
  const {
    value,
    setValue,
    maxRows,
    disabled,
    handleKeyDown,
    handleCompositionStart,
    handleCompositionEnd,
  } = usePromptInput();

  function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    handleKeyDown(event);
  }

  return (
    <InputBase
      multiline
      maxRows={maxRows}
      autoFocus={autoFocus}
      fullWidth
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) =>
        setValue(event.target.value)
      }
      onKeyDown={handleTextareaKeyDown}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      className={className}
      sx={sx}
      {...slotProps?.input}
    />
  );
}

export type PromptInputActionsSlotProps = {
  root?: Partial<StackProps>;
};

function PromptInputActions({
  children,
  sx,
  className,
  slotProps,
}: {
  children?: ReactNode;
  sx?: StackProps["sx"];
  className?: string;
  slotProps?: PromptInputActionsSlotProps;
}) {
  usePromptInput();
  const { sx: rootSx, ...rootRest } = slotProps?.root ?? {};
  return (
    <Stack
      direction="row"
      className={className}
      sx={[
        { alignItems: "center", gap: 0.5 },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
        ...(Array.isArray(rootSx) ? rootSx : rootSx ? [rootSx] : []),
      ]}
      {...rootRest}
    >
      {children}
    </Stack>
  );
}

export type PromptInputActionSlotProps = {
  tooltip?: Partial<TooltipProps>;
  root?: Partial<BoxProps>;
};

function PromptInputAction({
  tooltip,
  children,
  sx,
  className,
  slotProps,
}: {
  tooltip: string;
  children: ReactNode;
  sx?: BoxProps["sx"];
  className?: string;
  slotProps?: PromptInputActionSlotProps;
}) {
  usePromptInput();
  return (
    <Tooltip title={tooltip} describeChild {...slotProps?.tooltip}>
      <Box component="span" className={className} sx={sx} {...slotProps?.root}>
        {children}
      </Box>
    </Tooltip>
  );
}

PromptInput.Textarea = PromptInputTextarea;
PromptInput.Actions = PromptInputActions;
PromptInput.Action = PromptInputAction;

export { PromptInputTextarea, PromptInputActions, PromptInputAction };
