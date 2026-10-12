"use client";

import { useEffect, useMemo, useRef, type KeyboardEvent, type ReactNode } from "react";
import Box from "@mui/material/Box";
import { alpha } from "@mui/material/styles";
import type { SxProps, Theme } from "@mui/material/styles";
import { useVoiceSession } from "../../core/voice/use-voice-session";
import type { VoiceSession } from "../../core/voice/voice-types";
import { CallColorsContext, useCallColors, type CallColorOverrides } from "./call-colors";
import { CallContext, useCall, type CallContextValue, type CallPerson, type CallVisual } from "./call-context";
import { CallStageControls } from "./call-controls";
import { CallStageCaptions } from "./call-captions";
import { CallStageHeader } from "./call-header";
import { useMicrophonePicker, type MicrophoneProps } from "./call-microphone";
import { makeTranslate, type CallLabels } from "./call-labels";
import { CallProblemScreen, problemScreenOf } from "./call-problems";
import { CallStagePreview } from "./call-preview";
import { CallStageStatus } from "./call-status";

export interface CallStageProps extends MicrophoneProps {
  /** The call. Any transport can implement it; `createFakeVoiceSession()` stands in for tests and demos. */
  session: VoiceSession;
  /** The person on the call: `name` fills "The mic is yours, {name}"; `avatar` is the top-right slot. */
  user?: CallPerson;
  /** The agent: `name` for the labels; `avatar` is the mark in the centre. */
  agent?: CallPerson;
  /** The top-left slot, for the app's menu button. */
  menu?: ReactNode;
  /** Words per state and control; any key can be replaced. See `CallLabels`. */
  labels?: Partial<CallLabels>;
  /** `pill` (default): the level pill in the control row. `orb`: Niru's orb in the centre instead. */
  visual?: CallVisual;
  /** Overrides for the colours derived from the kit's tokens. */
  colors?: CallColorOverrides;
  /** Escape and the minimise button call this; the app draws a `CallStrip` meanwhile. */
  onMinimise?: () => void;
  /** Close on the problem screens. */
  onClose?: () => void;
  /** "Call again" on the ended screen, when starting a new call is not `session.retry()`. */
  onCallAgain?: () => void;
  /**
   * Fixed over the whole screen (inset 0, `100dvh`, padded by the device's safe areas so a notch or the
   * home bar never covers a control), above the page. Use it when the stage should take the screen
   * rather than fill a box you size yourself. Default false: the stage fills its parent.
   */
  overlay?: boolean;
  /** Take focus when mounted, so the Space and Escape shortcuts work at once. Default true. */
  autoFocus?: boolean;
  /** Replaces the default layout; compose `CallStage.Header`, `.Status`, `.Captions`, `.Preview` and `.Controls`. */
  children?: ReactNode;
  className?: string;
  sx?: SxProps<Theme>;
}

const INTERACTIVE = "button, a, input, textarea, select, [role='button'], [role='switch'], [contenteditable='true']";

function DefaultLayout() {
  const { snapshot } = useCall();
  const problem = problemScreenOf(snapshot);
  return (
    <>
      <CallStageHeader />
      <CallStagePreview />
      <Box sx={{ position: "relative", zIndex: 1, flex: 1, minWidth: 0, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: { xs: 2, sm: 3 } }}>
        {problem ? (
          <CallProblemScreen kind={problem} />
        ) : (
          <>
            <CallStageStatus />
            <CallStageCaptions />
          </>
        )}
      </Box>
      {problem ? null : (
        <Box sx={{ position: "relative", zIndex: 1 }}>
          <CallStageControls />
        </Box>
      )}
    </>
  );
}

/**
 * The full-screen call, laid out like Gemini Live: a dark stage with a soft glow rising from the
 * bottom in the accent colour; menu slot top left; captions toggle and the person's avatar top
 * right; the agent's mark and one large status line in the centre; a bottom row of round buttons
 * (camera, share screen, a wide pill that moves with the voice, microphone, end). Controls appear
 * only when the session reports the capability. Space toggles mute (unless a button has focus),
 * Escape minimises, End needs no confirmation. Compose your own with the parts, for example
 * `<CallStage session={s}><CallStage.Status /><CallStage.Controls /></CallStage>`.
 */
function CallStageRoot({ session, user = {}, agent = {}, menu, labels, visual = "pill", colors: overrides, onMinimise, onClose, onCallAgain, microphones, microphoneId, onSelectMicrophone, overlay = false, autoFocus = true, children, className, sx }: CallStageProps) {
  const snapshot = useVoiceSession(session);
  const colors = useCallColors(overrides);
  const root = useRef<HTMLDivElement>(null);
  const t = useMemo(() => makeTranslate(labels, { name: user.name, agent: agent.name }), [labels, user.name, agent.name]);
  useEffect(() => {
    if (autoFocus) root.current?.focus({ preventScroll: true });
  }, [autoFocus]);
  const microphone = useMicrophonePicker(session, snapshot, { microphones, microphoneId, onSelectMicrophone });
  const value = useMemo<CallContextValue>(
    () => ({ session, snapshot, colors, t, visual, agent, user, microphone, menu, onMinimise, onClose, onCallAgain }),
    [session, snapshot, colors, t, visual, agent, user, microphone, menu, onMinimise, onClose, onCallAgain]
  );
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && onMinimise) {
      event.preventDefault();
      onMinimise();
      return;
    }
    const target = event.target as HTMLElement;
    if (event.key === " " && !target.closest(INTERACTIVE) && snapshot.capabilities.mute && snapshot.phase !== "ended" && snapshot.phase !== "failed") {
      event.preventDefault();
      session.setMuted(!snapshot.muted);
    }
  };
  return (
    <CallColorsContext.Provider value={colors}>
      <CallContext.Provider value={value}>
        <Box
          ref={root}
          role="region"
          aria-label={t("region")}
          tabIndex={-1}
          data-testid="call-stage"
          data-phase={snapshot.phase}
          data-visual={visual}
          className={className}
          onKeyDown={onKeyDown}
          sx={[
            {
              position: "relative",
              display: "flex",
              flexDirection: "column",
              boxSizing: "border-box",
              width: "100%",
              height: "100%",
              minWidth: 0,
              minHeight: 0,
              overflow: "hidden",
              outline: "none",
              color: colors.text,
              bgcolor: colors.stage,
              backgroundImage: `radial-gradient(120% 60% at 50% 110%, ${alpha(colors.glow, 0.65)} 0%, ${alpha(colors.glow, 0.22)} 45%, transparent 78%)`,
              fontFamily: "inherit",
            },
            overlay && {
              position: "fixed",
              inset: 0,
              width: "100%",
              height: "100dvh",
              zIndex: (theme) => theme.zIndex.modal,
              pt: "env(safe-area-inset-top)",
              pb: "env(safe-area-inset-bottom)",
              pl: "env(safe-area-inset-left)",
              pr: "env(safe-area-inset-right)",
            },
            ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
          ]}
        >
          {children ?? <DefaultLayout />}
        </Box>
      </CallContext.Provider>
    </CallColorsContext.Provider>
  );
}

/** `CallStage` with its parts attached: `CallStage.Header`, `.Status`, `.Captions`, `.Preview`, `.Controls`. */
export const CallStage = Object.assign(CallStageRoot, {
  Header: CallStageHeader,
  Status: CallStageStatus,
  Captions: CallStageCaptions,
  Preview: CallStagePreview,
  Controls: CallStageControls,
});
