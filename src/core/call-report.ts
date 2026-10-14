/** Who said a line of a phone call: the assistant (`niru`) or the other side (`them`). */
export type CallSpeaker = "niru" | "them";

/** One line of a call transcript, with its place in the recording in seconds. */
export type CallTranscriptLine = { speaker: CallSpeaker; text: string; start_s: number; end_s: number };

/** The recording of a call. The kit never fetches it: the app resolves the attachment and passes a playable `src`. */
export type CallRecording = { attachment_id: string; media_type: string; duration_s: number };

/** How a call ended. */
export type CallStatus = "completed" | "no_answer" | "failed" | "refused";

/** The call-report message the engine sends after a call Niru placed. */
export type CallReportEvent = {
  kind: "call_report";
  call_id: string;
  status: CallStatus;
  recording?: CallRecording | null;
  transcript?: CallTranscriptLine[];
  transcript_truncated?: boolean;
};
