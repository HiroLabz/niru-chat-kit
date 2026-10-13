import type { TranscribeAudio } from "../../core/hooks/use-recorded-speech";

/** Every word of the recording voice input. Override any of them with `voice={{ labels }}`. */
export interface ComposerVoiceLabels {
  /** The mic button when idle. */
  start: string;
  /** The mic button while recording: stops and transcribes. */
  stop: string;
  /** Discards the recording or the pending transcription. */
  cancel: string;
  /** While the browser asks for the microphone. */
  asking: string;
  /** While recording. The elapsed time follows it on screen. */
  recording: string;
  /** While the app transcribes. */
  transcribing: string;
  permissionDenied: string;
  noMicrophone: string;
  microphoneBusy: string;
  recordingFailed: string;
  /** Shown when `transcribe` rejects without a message of its own. */
  transcriptionFailed: string;
  /** Shown when the transcription is empty. Not an error: nothing is added. */
  nothingHeard: string;
  /** The caret beside the mic, and the heading of the microphone list in a narrow row's More menu. */
  chooseMicrophone: string;
  /** A microphone whose name the browser has not given yet. */
  unnamedMicrophone: string;
}

export const DEFAULT_COMPOSER_VOICE_LABELS: ComposerVoiceLabels = {
  start: "Record a voice message",
  stop: "Stop and transcribe",
  cancel: "Cancel recording",
  asking: "Waiting for the microphone",
  recording: "Recording",
  transcribing: "Turning your voice into text",
  permissionDenied: "Microphone access was blocked. Allow it in your settings, then try again.",
  noMicrophone: "No microphone was found.",
  microphoneBusy: "The microphone is in use by something else.",
  recordingFailed: "The recording stopped. Try again.",
  transcriptionFailed: "Transcription failed. Try again.",
  nothingHeard: "Nothing was heard. Try again.",
  chooseMicrophone: "Choose microphone",
  unnamedMicrophone: "Microphone",
};

/**
 * The composer's `voice` prop as an object. Without `transcribe` it is the browser's speech
 * recognition, as `voice` set to true. With `transcribe` the mic records and hands the audio to the app.
 */
export interface ComposerVoiceOptions {
  /** Turns the recording into text. Resolve with the text; reject with an Error whose message is plain words for the person. */
  transcribe?: TranscribeAudio;
  /** A `deviceId` to record from; null or absent: the default microphone. Also the one checked in the microphone menu. */
  microphoneId?: string | null;
  /** The microphones to choose from (see `useMicrophones`). With at least one entry and `onSelectMicrophone`, a "Choose microphone" caret joins the mic button. */
  microphones?: readonly { deviceId: string; label: string }[];
  /** Called with the `deviceId` the person picks. Store it and pass it back as `microphoneId`; the next recording uses it. */
  onSelectMicrophone?: (deviceId: string) => void;
  /** Recording stops by itself, and is transcribed, after this long. Default 120000. */
  maxDurationMs?: number;
  /** When set, the mic is shown disabled with this sentence as its tooltip and description (for example while a call uses the microphone). */
  disabledReason?: string | null;
  /** Words for each state; any key can be replaced. */
  labels?: Partial<ComposerVoiceLabels>;
}
