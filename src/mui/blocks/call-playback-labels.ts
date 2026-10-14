/**
 * Every visible word of `CallPlayback`, with English defaults. Override any key with `labels`.
 * `{time}`, `{current}`, `{total}`, `{rate}`, `{speaker}`, `{text}` and `{count}` are filled in where used.
 */
export interface CallPlaybackLabels {
  title: string;
  statusCompleted: string;
  statusNoAnswer: string;
  statusFailed: string;
  statusRefused: string;
  /** The speaker name of Niru's lines. Give the app's own name for the assistant if it differs. */
  speakerNiru: string;
  /** The speaker name of the other side. Apps can pass the business name. */
  speakerThem: string;
  noRecording: string;
  loadingRecording: string;
  recordingError: string;
  retry: string;
  play: string;
  pause: string;
  /** The name of the seek bar. */
  seek: string;
  /** Spoken value of the seek bar, for example "0:12 of 1:30". */
  position: string;
  speed: string;
  /** Name of one speed button, for example "1.5x speed". */
  speedOption: string;
  /** Name of the download button (screen readers). */
  download: string;
  /** Visible text of the download button. */
  downloadShort: string;
  transcript: string;
  noTranscript: string;
  showFull: string;
  showLess: string;
  /** Name of a transcript line when it can be played. */
  playFromLine: string;
  /** Name of a transcript line when there is nothing to play. */
  line: string;
  truncated: string;
}

export const DEFAULT_CALL_PLAYBACK_LABELS: CallPlaybackLabels = {
  title: "Call ended",
  statusCompleted: "Completed",
  statusNoAnswer: "No answer",
  statusFailed: "Could not connect",
  statusRefused: "Not placed",
  speakerNiru: "Niru",
  speakerThem: "Them",
  noRecording: "No recording",
  loadingRecording: "Loading recording",
  recordingError: "Could not load the recording",
  retry: "Retry",
  play: "Play recording",
  pause: "Pause recording",
  seek: "Seek in recording",
  position: "{current} of {total}",
  speed: "Playback speed",
  speedOption: "{rate}x speed",
  download: "Download recording",
  downloadShort: "Download",
  transcript: "Transcript",
  noTranscript: "No transcript",
  showFull: "Show full transcript",
  showLess: "Show less",
  playFromLine: "{speaker} at {time}: {text}. Play from here",
  line: "{speaker} at {time}: {text}",
  truncated: "This transcript is shortened. The recording has the whole call.",
};
