/**
 * Every word the call screens say. Override any of them with the `labels` prop. `{name}` is the
 * person's name and `{agent}` the agent's; when there is no name, ", {name}" is dropped.
 */
export interface CallLabels {
  stepJoining: string;
  stepConnecting: string;
  stepMicrophone: string;
  stepAudio: string;
  stepReady: string;
  listening: string;
  listeningMuted: string;
  thinking: string;
  speaking: string;
  held: string;
  ended: string;
  failed: string;
  region: string;
  menu: string;
  minimise: string;
  hold: string;
  resume: string;
  captionsOn: string;
  captionsOff: string;
  captions: string;
  cameraOn: string;
  cameraOff: string;
  shareOn: string;
  shareOff: string;
  mute: string;
  unmute: string;
  end: string;
  sharing: string;
  stopSharing: string;
  tapToHear: string;
  deviceDenied: string;
  deviceUnavailable: string;
  micBlockedTitle: string;
  micBlockedBody: string;
  tryAgain: string;
  connectionLostTitle: string;
  connectionLostBody: string;
  callAgain: string;
  endedTitle: string;
  endedBody: string;
  close: string;
  openCall: string;
  callWith: string;
  showTranscript: string;
  hideTranscript: string;
  noTranscript: string;
  you: string;
  /** The agent's speaker name in a transcript when it has no name. */
  agentSpeaker: string;
}

export const DEFAULT_CALL_LABELS: CallLabels = {
  stepJoining: "Joining the call",
  stepConnecting: "Connecting",
  stepMicrophone: "Waiting for your microphone",
  stepAudio: "Setting up sound",
  stepReady: "Ready",
  listening: "The mic is yours, {name}",
  listeningMuted: "Your mic is off",
  thinking: "Thinking",
  speaking: "{agent} is talking",
  held: "Call on hold",
  ended: "Call ended",
  failed: "The call stopped",
  region: "Call",
  menu: "Menu",
  minimise: "Minimise call",
  hold: "Hold call",
  resume: "Resume",
  captionsOn: "Turn captions on",
  captionsOff: "Turn captions off",
  captions: "Captions",
  cameraOn: "Turn on camera",
  cameraOff: "Turn off camera",
  shareOn: "Share your screen",
  shareOff: "Stop sharing your screen",
  mute: "Mute microphone",
  unmute: "Unmute microphone",
  end: "End call",
  sharing: "Sharing your screen",
  stopSharing: "Stop",
  tapToHear: "Tap to hear",
  deviceDenied: "Your browser blocked access. Allow it in the site settings and try again.",
  deviceUnavailable: "That is not available on this device.",
  micBlockedTitle: "The microphone is blocked",
  micBlockedBody: "Allow the microphone for this site in your browser settings, then try again.",
  tryAgain: "Try again",
  connectionLostTitle: "Connection lost",
  connectionLostBody: "The call dropped. Check your connection and call again.",
  callAgain: "Call again",
  endedTitle: "Call ended",
  endedBody: "The transcript is in the conversation.",
  close: "Close",
  openCall: "Open call",
  callWith: "Call with {agent}",
  showTranscript: "Show transcript",
  hideTranscript: "Hide transcript",
  noTranscript: "Nothing was said.",
  you: "You",
  agentSpeaker: "Assistant",
};

export type CallLabelKey = keyof CallLabels;
export type CallTranslate = (key: CallLabelKey) => string;

/** Builds the lookup the call screens use: labels merged over the defaults, names filled in. */
export function makeTranslate(labels: Partial<CallLabels> | undefined, names: { name?: string; agent?: string }): CallTranslate {
  const merged = { ...DEFAULT_CALL_LABELS, ...labels };
  const agent = names.agent?.trim() || "Your assistant";
  const name = names.name?.trim() ?? "";
  return (key) => {
    const text = merged[key];
    const withName = name ? text.replace("{name}", name) : text.replace(/,?\s*\{name\}/, "");
    return withName.replace("{agent}", agent);
  };
}
