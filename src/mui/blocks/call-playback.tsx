"use client";

import { useMemo, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import type { CallRecording, CallStatus, CallTranscriptLine } from "../../core/call-report";
import { useChatKitStyles } from "../theme";
import { DEFAULT_CALL_PLAYBACK_LABELS, type CallPlaybackLabels } from "./call-playback-labels";
import { CallPlaybackControls, CallPlaybackProblem } from "./call-playback-player";
import { CallPlaybackTranscript } from "./call-playback-transcript";
import { useCallAudio } from "./use-call-audio";

export { DEFAULT_CALL_PLAYBACK_LABELS, type CallPlaybackLabels } from "./call-playback-labels";

export interface CallPlaybackProps {
  /** How the call ended; shown as a chip in plain words. */
  status: CallStatus;
  /** The recording's details (its duration is shown until the browser knows the real one). */
  recording?: CallRecording | null;
  /** The playable address of the recording (https, `blob:` or `data:`). The kit never fetches; the app resolves the attachment. */
  src?: string | null;
  /** The app is still resolving `src`: the player shows a loading line. */
  loading?: boolean;
  /** The app could not get the recording: the player shows an error, with Retry when `onRetry` is given. */
  failed?: boolean;
  transcript?: CallTranscriptLine[];
  /** The transcript was cut short: a note says so. */
  transcriptTruncated?: boolean;
  /** Default "Call ended" (from `labels.title`). */
  title?: ReactNode;
  /** For example who was called and how long it lasted. */
  subtitle?: ReactNode;
  /** The report sentence, drawn under the header. `children` is drawn too. */
  summary?: ReactNode;
  children?: ReactNode;
  /** Given, a Download button calls this. The kit saves nothing itself. */
  onDownload?: () => void;
  /** Given, an error (the browser could not play the file, or `failed`) shows a Retry button that calls this. */
  onRetry?: () => void;
  /** Every visible word; any key can be replaced (for example `speakerThem` with the business name). */
  labels?: Partial<CallPlaybackLabels>;
  /** Transcript lines shown before "Show full transcript". Default 3. */
  collapsedLines?: number;
  /** Start with the whole transcript open. Default false. */
  defaultExpanded?: boolean;
}

function statusText(status: CallStatus, l: CallPlaybackLabels): string {
  switch (status) {
    case "completed":
      return l.statusCompleted;
    case "no_answer":
      return l.statusNoAnswer;
    case "failed":
      return l.statusFailed;
    default:
      return l.statusRefused;
  }
}

function PlayerBlock({ src, recording, labels, lines, onDownload, onRetry, truncated, collapsedLines, defaultExpanded }: {
  src: string;
  recording?: CallRecording | null;
  labels: CallPlaybackLabels;
  lines: CallTranscriptLine[];
  truncated: boolean;
  onDownload?: () => void;
  onRetry?: () => void;
  collapsedLines: number;
  defaultExpanded: boolean;
}) {
  const audio = useCallAudio(src, recording?.duration_s ?? 0);
  const retry = () => {
    audio.reload();
    onRetry?.();
  };
  return (
    <>
      <audio {...audio.audioProps} />
      {audio.state === "error" ? (
        <CallPlaybackProblem text={labels.recordingError} onRetry={onRetry ? retry : undefined} retryLabel={labels.retry} />
      ) : (
        <CallPlaybackControls audio={audio} labels={labels} onDownload={onDownload} />
      )}
      <CallPlaybackTranscript
        lines={lines}
        truncated={truncated}
        labels={labels}
        current={audio.current}
        highlight={audio.state !== "error" && (audio.playing || audio.current > 0)}
        playing={audio.playing}
        canSeek={audio.state !== "error"}
        onSeek={audio.seekAndPlay}
        collapsedLines={collapsedLines}
        defaultExpanded={defaultExpanded}
      />
    </>
  );
}

/**
 * Playback of a phone call the assistant made: a header with the outcome, a player for the recording
 * (play and pause, seek, 1x / 1.5x / 2x, Download) and the transcript, whose playing line is marked
 * and kept in view; clicking a line plays from there. The kit never fetches: pass the playable `src`.
 * Without a recording the transcript still shows, with "No recording".
 */
export function CallPlayback({
  status,
  recording,
  src,
  loading = false,
  failed = false,
  transcript,
  transcriptTruncated = false,
  title,
  subtitle,
  summary,
  children,
  onDownload,
  onRetry,
  labels,
  collapsedLines = 3,
  defaultExpanded = false,
}: CallPlaybackProps) {
  const l = useMemo(() => ({ ...DEFAULT_CALL_PLAYBACK_LABELS, ...labels }), [labels]);
  const { scheme } = useChatKitStyles();
  const lines = transcript ?? [];
  const tone = status === "completed" ? "success" : status === "no_answer" ? "warning" : "error";
  const playable = Boolean(src) && !loading && !failed;
  return (
    <Box
      role="region"
      aria-label={typeof title === "string" ? title : l.title}
      data-testid="call-playback"
      data-status={status}
      sx={scheme((c) => ({ display: "flex", flexDirection: "column", gap: 1.25, minWidth: 0, width: "100%", p: 1.5, borderRadius: 2, border: "1px solid", borderColor: c.border, bgcolor: c.surface, color: c.text }))}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, minWidth: 0 }}>
        <PhoneOutlinedIcon fontSize="small" aria-hidden sx={scheme((c) => ({ color: c.mutedText, mt: "2px", flexShrink: 0 }))} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.75 }}>
            <Typography component="h2" variant="subtitle2" sx={{ fontWeight: 600 }}>
              {title ?? l.title}
            </Typography>
            <Chip
              size="small"
              variant="outlined"
              label={statusText(status, l)}
              data-testid="call-status"
              sx={scheme((c) => ({ color: c[tone], borderColor: c[tone] }))}
            />
          </Box>
          {subtitle ? (
            <Typography variant="caption" component="div" sx={scheme((c) => ({ color: c.mutedText, overflowWrap: "anywhere" }))}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
      </Box>
      {summary || children ? (
        <Box sx={{ minWidth: 0 }}>
          {summary ? <Typography variant="body2">{summary}</Typography> : null}
          {children}
        </Box>
      ) : null}
      {playable ? (
        <PlayerBlock
          key={src}
          src={src as string}
          recording={recording}
          labels={l}
          lines={lines}
          truncated={transcriptTruncated}
          onDownload={onDownload}
          onRetry={onRetry}
          collapsedLines={collapsedLines}
          defaultExpanded={defaultExpanded}
        />
      ) : (
        <>
          {failed ? (
            <CallPlaybackProblem text={l.recordingError} onRetry={onRetry} retryLabel={l.retry} />
          ) : loading ? (
            <Typography role="status" variant="caption" sx={scheme((c) => ({ color: c.mutedText }))}>
              {l.loadingRecording}
            </Typography>
          ) : (
            <Typography variant="caption" sx={scheme((c) => ({ color: c.mutedText }))}>
              {l.noRecording}
            </Typography>
          )}
          <CallPlaybackTranscript
            lines={lines}
            truncated={transcriptTruncated}
            labels={l}
            current={0}
            highlight={false}
            playing={false}
            canSeek={false}
            onSeek={() => undefined}
            collapsedLines={collapsedLines}
            defaultExpanded={defaultExpanded}
          />
        </>
      )}
    </Box>
  );
}
