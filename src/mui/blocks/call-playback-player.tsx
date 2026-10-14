"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Slider from "@mui/material/Slider";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import ReplayOutlinedIcon from "@mui/icons-material/ReplayOutlined";
import { formatCallDuration } from "../../core/voice/voice-summary";
import { useChatKitStyles } from "../theme";
import { fillLabel } from "./message-media-labels";
import type { CallPlaybackLabels } from "./call-playback-labels";
import { CALL_PLAYBACK_RATES, type CallAudio } from "./use-call-audio";

export const clock = (seconds: number) => formatCallDuration(seconds * 1000);

export function CallPlaybackProblem({ text, onRetry, retryLabel }: { text: string; onRetry?: () => void; retryLabel: string }) {
  const { scheme } = useChatKitStyles();
  return (
    <Box sx={scheme((c) => ({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1, color: c.mutedText }))}>
      <Typography role="status" variant="body2">
        {text}
      </Typography>
      {onRetry ? (
        <Button size="small" startIcon={<ReplayOutlinedIcon />} onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </Box>
  );
}

/** The controls of the recording. The `<audio>` element itself is rendered by the parent. */
export function CallPlaybackControls({
  audio,
  labels,
  onDownload,
}: {
  audio: CallAudio;
  labels: CallPlaybackLabels;
  onDownload?: () => void;
}) {
  const { scheme } = useChatKitStyles();
  const total = audio.duration;
  const shown = Math.min(audio.current, total || audio.current);
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, minWidth: 0 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
        <IconButton
          onClick={audio.toggle}
          aria-label={audio.playing ? labels.pause : labels.play}
          sx={scheme((c) => ({ flexShrink: 0, width: 40, height: 40, bgcolor: c.accent, color: c.accentContrast, "&:hover": { bgcolor: c.accent, opacity: 0.9 } }))}
        >
          {audio.playing ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
        </IconButton>
        <Typography variant="caption" aria-hidden sx={scheme((c) => ({ color: c.mutedText, fontVariantNumeric: "tabular-nums", minWidth: 32 }))}>
          {clock(shown)}
        </Typography>
        <Slider
          size="small"
          min={0}
          max={total || 1}
          step={1}
          value={Math.min(shown, total || 1)}
          disabled={!total}
          onChange={(_, value) => audio.seek(Array.isArray(value) ? (value[0] ?? 0) : value)}
          aria-label={labels.seek}
          getAriaValueText={() => fillLabel(labels.position, { current: clock(shown), total: clock(total) })}
          sx={{ flex: 1, minWidth: 0, mx: 0.5 }}
        />
        <Typography variant="caption" aria-hidden sx={scheme((c) => ({ color: c.mutedText, fontVariantNumeric: "tabular-nums", minWidth: 32, textAlign: "right" }))}>
          {clock(total)}
        </Typography>
      </Box>
      {audio.state === "loading" ? (
        <Typography role="status" variant="caption" sx={scheme((c) => ({ color: c.mutedText }))}>
          {labels.loadingRecording}
        </Typography>
      ) : null}
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 0.5 }}>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={audio.rate}
          onChange={(_, next: number | null) => next !== null && audio.setRate(next)}
          aria-label={labels.speed}
        >
          {CALL_PLAYBACK_RATES.map((rate) => (
            <ToggleButton
              key={rate}
              value={rate}
              aria-label={fillLabel(labels.speedOption, { rate })}
              sx={{ px: 1, py: 0.25, minWidth: 40, textTransform: "none", fontVariantNumeric: "tabular-nums" }}
            >
              {rate}x
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        {onDownload ? (
          <Button size="small" aria-label={labels.download} startIcon={<FileDownloadOutlinedIcon />} onClick={onDownload}>
            {labels.downloadShort}
          </Button>
        ) : null}
      </Box>
    </Box>
  );
}
